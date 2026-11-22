import type { ProfileInput, ProfileRepo, ProfileRow } from "../repositories/profile.repository.js";
import { NotFoundError } from "./errors.js";

export type Profile = ProfileRow;

export class ProfileService {
  constructor(private readonly repo: ProfileRepo) {}

  async get(): Promise<Profile> {
    const row = await this.repo.find();
    if (!row) throw new NotFoundError("Profile not found");
    return row;
  }

  update(input: ProfileInput): Promise<Profile> {
    return this.repo.upsert(input);
  }
}
