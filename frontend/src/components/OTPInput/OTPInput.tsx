// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Input } from 'antd';
import './OTPInput.scss';

const OTPInput = ({ value, onChange, length = 6 }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1); // Only take first character
    setOtp(newOtp);

    // Call parent onChange
    const otpValue = newOtp.join('');
    onChange(otpValue);

    // Auto focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    
    if (/^\d*$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        if (i < length) {
          newOtp[i] = pastedData[i];
        }
      }
      setOtp(newOtp);
      
      const otpValue = newOtp.join('');
      onChange(otpValue);

      // Focus next empty input or last input
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // Sync with parent value
  React.useEffect(() => {
    if (value === '') {
      setOtp(Array(length).fill(''));
    }
  }, [value, length]);

  return (
    <div className="otp-input-container">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          value={otp[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          maxLength={1}
          className="otp-input"
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

export default OTPInput;

