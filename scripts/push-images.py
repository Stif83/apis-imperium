"""Pousse les images de l'archive (docker save, format OCI) vers un registre, sans Docker.

Rien n'est téléchargé : seul le contenu de l'archive est envoyé. Python standard uniquement.

    REGISTRY_TOKEN=<jeton OKD> python scripts/push-images.py dist/apiculteur-images-1.0.0.tar \
        default-route-openshift-image-registry.apps.okd.lab.local apps-apisimperium --ca-file ca.crt
"""

import argparse
import http.client
import json
import os
import ssl
import sys
import tarfile
from urllib.parse import urlsplit

NAME_KEY = "io.containerd.image.name"


class Registry:
    def __init__(self, host: str, token: str, context: ssl.SSLContext):
        self.host, self.context = host, context
        self.auth = {"Authorization": f"Bearer {token}"}

    def request(self, method: str, url: str, body=None, headers=None):
        parts = urlsplit(url)
        conn = http.client.HTTPSConnection(parts.netloc or self.host, context=self.context, timeout=600)
        path = parts.path + (f"?{parts.query}" if parts.query else "")
        conn.request(method, path, body=body, headers={**self.auth, **(headers or {})})
        response = conn.getresponse()
        data = response.read()
        conn.close()
        return response.status, response.headers, data

    def push_blob(self, repo: str, digest: str, size: int, open_blob) -> bool:
        status, _, _ = self.request("HEAD", f"/v2/{repo}/blobs/{digest}")
        if status == 200:
            return False
        status, headers, data = self.request("POST", f"/v2/{repo}/blobs/uploads/")
        if status != 202:
            raise SystemExit(f"Ouverture d'envoi refusée ({status}) pour {repo} : {data[:300]!r}")
        location = headers["Location"]
        location += ("&" if "?" in location else "?") + f"digest={digest}"
        with open_blob() as blob:
            status, _, data = self.request(
                "PUT", location, body=blob,
                headers={"Content-Type": "application/octet-stream", "Content-Length": str(size)},
            )
        if status != 201:
            raise SystemExit(f"Envoi de {digest[:19]} refusé ({status}) : {data[:300]!r}")
        return True

    def push_manifest(self, repo: str, tag: str, media_type: str, content: bytes) -> None:
        status, _, data = self.request("PUT", f"/v2/{repo}/manifests/{tag}", body=content, headers={"Content-Type": media_type})
        if status != 201:
            raise SystemExit(f"Manifeste {repo}:{tag} refusé ({status}) : {data[:300]!r}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("archive")
    parser.add_argument("registry", help="nom d'hôte du registre")
    parser.add_argument("namespace", help="projet de destination dans le registre")
    parser.add_argument("--arch", default="amd64")
    parser.add_argument("--ca-file", help="autorité de certification du registre (PEM)")
    args = parser.parse_args()

    token = os.environ.get("REGISTRY_TOKEN")
    if not token:
        raise SystemExit("Définir la variable d'environnement REGISTRY_TOKEN.")
    registry = Registry(args.registry, token, ssl.create_default_context(cafile=args.ca_file))

    with tarfile.open(args.archive) as tar:
        def read(digest: str) -> bytes:
            return tar.extractfile(f"blobs/{digest.replace(':', '/')}").read()

        for entry in json.load(tar.extractfile("index.json"))["manifests"]:
            name, tag = entry["annotations"][NAME_KEY].rsplit(":", 1)
            repo = f"{args.namespace}/{name.rsplit('/', 1)[-1]}"
            descriptor = entry
            if "index" in entry["mediaType"] or "manifest.list" in entry["mediaType"]:
                platforms = json.loads(read(entry["digest"]))["manifests"]
                descriptor = next(
                    (m for m in platforms if m.get("platform", {}).get("os") == "linux" and m["platform"].get("architecture") == args.arch),
                    None,
                )
                if descriptor is None:
                    raise SystemExit(f"{name}:{tag} : aucune variante linux/{args.arch} dans l'archive.")
            manifest_bytes = read(descriptor["digest"])
            manifest = json.loads(manifest_bytes)
            sent = 0
            for blob in [manifest["config"], *manifest["layers"]]:
                path = f"blobs/{blob['digest'].replace(':', '/')}"
                sent += registry.push_blob(repo, blob["digest"], blob["size"], lambda: tar.extractfile(path))
            registry.push_manifest(repo, tag, descriptor["mediaType"], manifest_bytes)
            print(f"{repo}:{tag} poussée ({sent} couche(s) envoyée(s), {len(manifest['layers']) + 1 - sent} déjà présente(s))")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
