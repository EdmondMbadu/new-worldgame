export class Post {
  postid?: string;
  content?: string;
  title?: string;
  comments?: { [key: string]: string } = {};
  likes?: string;
}
