import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from './ui/input';

interface InputFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

export const InputField = ({ name, label, type = 'text', placeholder, required }: InputFieldProps) => {
  const { register } = useFormContext();
  return (
    <div className="space-y-2">
      {label && <label htmlFor={name} className="text-sm font-medium">{label}</label>}
      <Input id={name} type={type} placeholder={placeholder} required={required} {...register(name)} />
    </div>
  );
};
