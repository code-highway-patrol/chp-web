import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

if (!cloudName) {
  throw new Error(
    "VITE_CLOUDINARY_CLOUD_NAME is not set. Add it to .env with the VITE_ prefix.",
  );
}

export const cld = new Cloudinary({ cloud: { cloudName } });

export const uploadPreset =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export function cldFetch(
  remoteUrl: string,
  transforms = "c_pad,w_64,h_64,b_transparent,f_auto,q_auto",
): string {
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transforms}/${encodeURIComponent(remoteUrl)}`;
}
