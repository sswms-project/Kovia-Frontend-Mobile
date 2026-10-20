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
const passwordField = z.string()
  .refine(passwordRequirements[0].validate, passwordRequirements[0].message)
  .refine(passwordRequirements[1].validate, passwordRequirements[1].message)
  .refine(passwordRequirements[2].validate, passwordRequirements[2].message)
  .refine(passwordRequirements[3].validate, passwordRequirements[3].message)
  .refine(passwordRequirements[4].validate, passwordRequirements[4].message);

export const loginSchema = z
  .object({
    email: emailField.max(255, 'Email tối đa 255 ký tự'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    captchaId: z.string().max(36, 'Mã CAPTCHA không hợp lệ').optional(),
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

export const registerSchema = z
  .object({
    tenantName: z.string().trim().min(1, 'Tên doanh nghiệp là bắt buộc').max(255, 'Tên doanh nghiệp tối đa 255 ký tự'),
    ownerName: z.string().trim().min(1, 'Tên chủ sở hữu là bắt buộc').max(255, 'Tên chủ sở hữu tối đa 255 ký tự'),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value.length === 0 || /^(0|\+84)[3-9][0-9]{8}$/.test(value),
        'Số điện thoại Việt Nam không hợp lệ',
      ),
    email: emailField.max(255, 'Email tối đa 255 ký tự'),
    address: z.string().trim().min(1, 'Địa chỉ là bắt buộc').max(500, 'Địa chỉ tối đa 500 ký tự'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    acceptTerms: z.boolean().refine((value) => value, 'Bạn cần đồng ý với điều khoản dịch vụ'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

export const verifyTwoFactorSchema = z.object({
  otp: z
    .string()
    .length(6, 'Mã OTP phải gồm đúng 6 chữ số')
    .regex(/^\d{6}$/, 'Mã OTP chỉ gồm chữ số'),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resendVerificationSchema = z.object({ email: emailField.max(255, 'Email tối đa 255 ký tự') });

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type VerifyTwoFactorFormValues = z.infer<typeof verifyTwoFactorSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const otpSchema = verifyTwoFactorSchema;
export const resetPasswordRequestSchema = z.object({
  token: z.string().trim().min(1, 'Nhập token hoặc liên kết từ email'),
  newPassword: passwordField,
});
export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Nhập token hoặc liên kết từ email'),
});
export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Nhập họ tên').max(255, 'Họ tên tối đa 255 ký tự'),
  phone: z.string().max(30, 'Số điện thoại tối đa 30 ký tự').refine(
    (value) => !value || /^(0|\+84)[3-9][0-9]{8}$/.test(value),
    'Số điện thoại Việt Nam không hợp lệ',
  ),
});
export type LoginInput = LoginFormValues;
export type OtpInput = VerifyTwoFactorFormValues;
export type ForgotPasswordInput = ForgotPasswordFormValues;
export type ResetPasswordInput = z.infer<typeof resetPasswordRequestSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
