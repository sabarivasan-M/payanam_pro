import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Input, type InputProps } from '@/components/ui/Input';

interface Props<T extends FieldValues> extends Omit<InputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  /** Convert the text to the form value (e.g. numbers) */
  parse?: (text: string) => unknown;
}

export function FormInput<T extends FieldValues>({ control, name, parse, ...rest }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...rest}
          value={field.value === undefined || field.value === null ? '' : String(field.value)}
          onChangeText={(text) => field.onChange(parse ? parse(text) : text)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

export const parseNumber = (text: string) => {
  const cleaned = text.replace(/[^\d.]/g, '');
  return cleaned === '' ? undefined : Number(cleaned);
};
