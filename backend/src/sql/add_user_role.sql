ALTER TABLE user ADD COLUMN role VARCHAR(20) DEFAULT 'user' COMMENT '角色(user/admin)' AFTER nickname;
