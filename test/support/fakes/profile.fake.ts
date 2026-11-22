import type {
  ProfileInput,
  ProfileRepo,
  ProfileRow,
} from "../../../src/repositories/profile.repository";

export class FakeProfileRepo implements ProfileRepo {
  row: ProfileRow | null = null;
  upserts: ProfileInput[] = [];

  async find(): Promise<ProfileRow | null> {
    return this.row;
  }

  async upsert(input: ProfileInput): Promise<ProfileRow> {
    this.upserts.push(input);
    this.row = { ...input, id: 1, updatedAt: new Date() };
    return this.row;
  }
}

export const profileInput: ProfileInput = {
  fullName: "Ada",
  headline: "Engineer",
  masterCv: "cv",
  publicSystemPrompt: "p",
  recruiterSystemPrompt: "r",
  tailorSystemPrompt: "t",
};
