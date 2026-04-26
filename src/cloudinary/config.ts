import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "").trim();

if (import.meta.env.PROD && !cloudName) {
  throw new Error(
    "VITE_CLOUDINARY_CLOUD_NAME is not set. Add it to .env with the VITE_ prefix.",
  );
}

export const cld = new Cloudinary({
  cloud: { cloudName: cloudName || "demo" },
});

export const uploadPreset =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export function cldFetch(
  remoteUrl: string,
  transforms = "c_pad,w_64,h_64,b_transparent,f_auto,q_auto",
): string {
  if (!cloudName) {
    return remoteUrl;
  }
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transforms}/${encodeURIComponent(remoteUrl)}`;
}
