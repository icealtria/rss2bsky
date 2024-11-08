import { BlobRef } from "@atproto/api";

export interface Post {
    text: string | undefined;
    facets?: facet[]
    embed?: {
        $type: string;
        images?: Image[];
    };
    createdAt?: string;
}

interface facet {
    index: {
        byteStart: number;
        byteEnd: number;
    },
    features: {
        [key: string]: any;
    }[]
}

interface Image {
    alt?: string;
    image: BlobRef;
    aspectRatio?: {
        width: number;
        height: number;
    };
}

export type Title = {
    title: string;
    url: string;
}