// @ts-nocheck
import { Dropdown, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '../../features/language/languageSlice';

const LanguageSwitcher = () => {
  const dispatch = useDispatch();
  // eslint-disable-next-line
  const currentLanguage = useSelector((state) => (state || {}).language?.currentLanguage || 'vi');

  const languageOptions = [
    { key: 'vi', label: '🇻🇳 Tiếng Việt' },
    { key: 'en', label: '🇬🇧 English' },
  ];

  // eslint-disable-next-line
  const handleLanguageChange = (params) => {
    const newLanguage = params?.key;
    dispatch(setLanguage(newLanguage));
  };

  return (
    <Dropdown
      menu={{
        items: languageOptions,
        onClick: handleLanguageChange,
        selectedKeys: [currentLanguage],
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button type="text" icon={<GlobalOutlined />} size="large">
        {currentLanguage === 'vi' ? '🇻🇳' : '🇬🇧'}
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;

