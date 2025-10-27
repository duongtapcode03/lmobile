// @ts-nocheck
import React from 'react';
import { Input } from 'antd';

const PasswordInput = ({ placeholder, ...rest }) => {
  return (
    <Input.Password
      placeholder={placeholder}
      {...rest}
    />
  );
};

export default PasswordInput;

