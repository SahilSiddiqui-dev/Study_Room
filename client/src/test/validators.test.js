import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { createRoomSchema } from '../validators/room.validator';
import { createSessionSchema, breakReasonSchema } from '../validators/session.validator';

describe('Zod Form Schemas Validation', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const valid = {
        username: 'scholar_42',
        email: 'scholar@studyroom.test',
        password: 'Password123',
        avatar: 'owl',
        timezone: 'UTC',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid usernames (too short, capital letters, special chars)', () => {
      expect(registerSchema.safeParse({ username: 'ab', email: 'a@b.com', password: 'Password123' }).success).toBe(false);
      expect(registerSchema.safeParse({ username: 'Invalid-User', email: 'a@b.com', password: 'Password123' }).success).toBe(false);
      expect(registerSchema.safeParse({ username: 'user space', email: 'a@b.com', password: 'Password123' }).success).toBe(false);
    });

    it('rejects passwords without both letters and numbers or shorter than 8 chars', () => {
      expect(registerSchema.safeParse({ username: 'valid_user', email: 'a@b.com', password: 'short1' }).success).toBe(false);
      expect(registerSchema.safeParse({ username: 'valid_user', email: 'a@b.com', password: 'onlyletters' }).success).toBe(false);
      expect(registerSchema.safeParse({ username: 'valid_user', email: 'a@b.com', password: '123456789' }).success).toBe(false);
    });

    it('rejects unsupported avatars', () => {
      const invalid = {
        username: 'scholar_42',
        email: 'scholar@studyroom.test',
        password: 'Password123',
        avatar: 'koala', // Not in server enum
      };
      expect(registerSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'alice@studyroom.test',
        password: 'Demo@1234',
      });
      expect(result.success).toBe(true);
    });

    it('rejects malformed email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createRoomSchema', () => {
    it('accepts valid room creation payload', () => {
      const valid = {
        name: 'Calculus III Deep Dive',
        subject: 'Mathematics',
        isPrivate: false,
        pomodoro: { focusMin: 25, breakMin: 5 },
      };
      expect(createRoomSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects out of bounds pomodoro durations', () => {
      const invalid = {
        name: 'Math Room',
        subject: 'Math',
        isPrivate: false,
        pomodoro: { focusMin: 3, breakMin: 50 }, // focus < 5, break > 30
      };
      expect(createRoomSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('breakReasonSchema', () => {
    it('accepts valid server enum categories', () => {
      expect(breakReasonSchema.safeParse({ category: 'phone', note: 'Checked text' }).success).toBe(true);
      expect(breakReasonSchema.safeParse({ category: 'fatigue' }).success).toBe(true);
    });

    it('rejects non-existent categories', () => {
      expect(breakReasonSchema.safeParse({ category: 'gaming' }).success).toBe(false);
    });
  });
});
