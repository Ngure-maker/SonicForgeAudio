from typing import Protocol


class FileStorageProvider(Protocol):
    def get_download_url(self, relative_path: str) -> str: ...


class LocalStorageProvider:
    def get_download_url(self, relative_path: str) -> str:
        return f"/media/{relative_path}"


class S3StorageProvider:
    def get_download_url(self, relative_path: str) -> str:
        raise NotImplementedError("S3 provider can be plugged in later.")
