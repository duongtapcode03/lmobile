// @ts-nocheck
import React from 'react';
import { Form } from 'antd';
import './FormField.scss';

const FormField = ({ children, label, name, rules, ...rest }) => {
  return (
    <Form.Item
      label={label}
      name={name}
      rules={rules}
      className="form-field"
      {...rest}
    >
      {children}
    </Form.Item>
  );
};

export default FormField;

