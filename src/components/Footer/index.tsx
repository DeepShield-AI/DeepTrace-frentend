import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      links={[
        {
          key: 'Produced by 泉城实验室',
          title: 'Produced by 泉城实验室',
          href: 'https://www.qcl.edu.cn/',
          blankTarget: true,
        },
        {
          key: '网络空间安全试验平台团队',
          title: '网络空间安全试验平台团队',
          href: 'https://ant.design',
          blankTarget: true,
        },
      ]}
    />
  );
};

export default Footer;
