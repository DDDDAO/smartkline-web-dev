import type { CachedAvatarImage } from "./types";

export class TradePointAvatarImageCache {
  private readonly images = new Map<string, CachedAvatarImage>();

  getImage(url: string | null | undefined, requestUpdate: (() => void) | undefined): HTMLImageElement | null {
    if (!url) {
      return null;
    }

    const cachedImage = this.images.get(url);
    if (cachedImage) {
      return cachedImage.status === "ready" ? cachedImage.image : null;
    }

    const image = new Image();
    this.images.set(url, { image, status: "loading" });
    image.decoding = "async";
    image.onload = () => {
      this.images.set(url, { image, status: "ready" });
      requestUpdate?.();
    };
    image.onerror = () => {
      this.images.set(url, { image: null, status: "error" });
      requestUpdate?.();
    };
    image.src = url;
    return null;
  }
}
