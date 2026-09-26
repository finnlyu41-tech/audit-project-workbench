"""Inspect an immutable Pages artifact; reject links/traversal before extraction."""
import pathlib
import shutil
import sys
import tarfile


def unpack(source, destination):
    destination = pathlib.Path(destination)
    with tarfile.open(source, "r:") as archive:
        members = archive.getmembers()
        if not members or len(members) > 10000 or sum(m.size for m in members) > 100_000_000:
            raise ValueError("Unexpected Pages archive size")
        seen = set()
        for member in members:
            path = pathlib.PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts or not (member.isfile() or member.isdir()):
                raise ValueError("Unsafe Pages archive member")
            if str(path) in seen:
                raise ValueError("Duplicate Pages archive member")
            seen.add(str(path))
        destination.mkdir(parents=True, exist_ok=False)
        for member in members:
            target = destination / member.name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as incoming, target.open("xb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing)


if __name__ == "__main__":
    unpack(*sys.argv[1:])
