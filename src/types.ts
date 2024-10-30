import { BlobRef } from "@atproto/api";

export interface Post {
    text: string | undefined;
    embed?: {
        $type: string;
        images?: Image[];
    };
    createdAt?: string;
}

interface Image {
    alt?: string;
    image: BlobRef;
    aspectRatio?: {
        width: number;
        height: number;
    };
}