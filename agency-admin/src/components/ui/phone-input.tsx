'use client';

import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';
import { Input } from '@/components/ui/input';
import { ControllerRenderProps } from 'react-hook-form';

interface PhoneInputProps {
  field: ControllerRenderProps<any, any>;
  placeholder?: string;
}

export function PhoneInputComponent({ field, placeholder }: PhoneInputProps) {
  return (
    <PhoneInput
      international
      defaultCountry="RU"
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      disabled={field.disabled}
      placeholder={placeholder}
      inputComponent={Input}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}