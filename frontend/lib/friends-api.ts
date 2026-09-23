import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type Friend = {
  id: string;              // friendship id
  user_id: string;         // other user's id
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: FriendshipStatus;
  created_at: string;
};

export type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_email: string | null;
  other_user_avatar: string | null;
};

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const listFriends = async (): Promise<Friend[]> => {
  const res = await api.get("/api/friends");
  return res.data;
};

export const listFriendRequests = async (): Promise<FriendRequest[]> => {
  const res = await api.get("/api/friends/requests");
  return res.data;
};

export const sendFriendRequest = async (payload: {
  user_id?: string;
  email?: string;
}): Promise<FriendRequest> => {
  const res = await api.post("/api/friends/request", payload);
  return res.data;
};

export const acceptFriendRequest = async (
  friendshipId: string
): Promise<FriendRequest> => {
  const res = await api.post(`/api/friends/accept/${friendshipId}`);
  return res.data;
};

export const declineFriendRequest = async (
  friendshipId: string
): Promise<void> => {
  await api.post(`/api/friends/decline/${friendshipId}`);
};