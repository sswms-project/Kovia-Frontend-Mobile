import { z } from 'zod';

// Mirrors FE/src/features/auth/schemas/register.schema.ts so both clients enforce the same rules.
export const passwordRequirements = [
  {
    id: 'min-length',
    label: 'Ít nhất 8 ký tự',
    message: 'Mật khẩu phải có ít nhất 8 ký tự',
    validate: (value: string) => value.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Có ít nhất một chữ hoa',
    message: 'Mật khẩu phải có ít nhất một chữ hoa',
    validate: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'Có ít nhất một chữ thường',
    message: 'Mật khẩu phải có ít nhất một chữ thường',
    validate: (value: string) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'Có ít nhất một chữ số',
    message: 'Mật khẩu phải có ít nhất một chữ số',
    validate: (value: string) => /[0-9]/.test(value),
  },
  {
    id: 'special-character',
    label: 'Có ít nhất một ký tự đặc biệt',
    message: 'Mật khẩu phải có ký tự đặc biệt',
    validate: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
  },
] as const;

const emailField = z.string().trim().min(1, 'Email là bắt buộc').email('Email không hợp lệ');

export const loginSchema = z
  .object({
    email: z.string().trim().email('Nhập email hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    captchaId: z.string().optional(),
    captchaAnswer: z.string().trim().max(20, 'Câu trả lời CAPTCHA không hợp lệ').optional(),
  })
  .superRefine((values, context) => {
    if (values.captchaId && !values.captchaAnswer) {
      context.addIssue({
        code: 'custom',
        path: ['captchaAnswer'],
        message: 'Vui lòng nhập kết quả CAPTCHA',
      });
    }
  });

export const verifyTwoFactorSchema = z.object({
  otp: z
    .string()
    .length(6, 'Mã OTP phải gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ gồm chữ số'),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resendVerificationSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .refine(passwordRequirements[0].validate, passwordRequirements[0].message)
      .refine(passwordRequirements[1].validate, passwordRequirements[1].message)
      .refine(passwordRequirements[2].validate, passwordRequirements[2].message)
      .refine(passwordRequirements[3].validate, passwordRequirements[3].message)
      .refine(passwordRequirements[4].validate, passwordRequirements[4].message),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type VerifyTwoFactorFormValues = z.infer<typeof verifyTwoFactorSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
