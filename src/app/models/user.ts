export class User {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: Avatar;
  profileCredential?: string;
  profileDescription?: string;
  employement?: string;
  education?: string;
  location?: string;
  dateJoined?: string;
  followers?: string;
  following?: string;
  followersArray?: string[];
  followingArray?: string[];
  numberOfPosts?: string;
  numberOfContributions?: string;
  contentViews?: string;
}

export class Avatar {
  path?: string;
  size?: string;
  downloadURL?: string;
}
