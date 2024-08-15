export class User {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
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
  goal?: string;
  sdgsSelected?: string[];
  solutionEnvironment?: SolutionEnvironment;
}

export class Avatar {
  path?: string;
  size?: string;
  downloadURL?: string;
}
export class Tournament {
  solutionId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  city?: string;
  country?: string;
}
export class NewUser {
  firstName?: string;
  lastname?: string;
  email?: string;
  password?: string;
  goal?: string;
  sdgsSelected?: string[];
}
export class SolutionEnvironment {
  focus?: string;
  sdgInterested?: string[];
}
