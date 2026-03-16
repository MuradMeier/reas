import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SelectFieldProps {
  name: string;
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

export const SelectField = ({ name, label, options, placeholder, required }: SelectFieldProps) => {
  const { setValue, watch } = useFormContext();
  const value = watch(name);
  return (
    <div className="space-y-2">
      {label && <label htmlFor={name} className="text-sm font-medium">{label}</label>}
      <Select onValueChange={(v) => setValue(name, v)} value={value} required={required}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
