export class Post {
  postid?: string;
  content?: string;
  comments?: { [key: string]: string } = {};
  likes?: string;
}
