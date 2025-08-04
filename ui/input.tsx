import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />;
});

Input.displayName = 'Input';

export default Input;
