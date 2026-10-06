-- The Creator Dashboard shows Pending vs Joined invites; this records
-- *when* a pending invite was redeemed, set explicitly by
-- redeemInvite() alongside is_used = true, so "Joined" rows can show a
-- real timestamp instead of only the original invite's created_at.
alter table invite_tokens add column if not exists used_at timestamptz;
