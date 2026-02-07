
export interface UserPreference {
  user_id: string;
  font_size: number;
  font_family: string;
  line_height: string;
}

export interface UserPreferenceUpdate {
  font_size?: number;
  font_family?: string;
  line_height?: string;
}
