export interface Post {
    text: string | undefined;
    embed?: {
        $type: string;
        images?: any[];
    };
    createdAt: string;
}