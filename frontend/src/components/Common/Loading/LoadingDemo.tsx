import React, { useState } from 'react';
import { Button, Space, Card } from 'antd';
import { Loading } from '@components';

const LoadingDemo: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Loading Component Demo</h2>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Size Variants */}
        <Card title="Size Variants">
          <Space size="large">
            <div>
              <h4>Small</h4>
              <Loading size="small" text="Small loading" />
            </div>
            <div>
              <h4>Medium</h4>
              <Loading size="medium" text="Medium loading" />
            </div>
            <div>
              <h4>Large</h4>
              <Loading size="large" text="Large loading" />
            </div>
          </Space>
        </Card>

        {/* Animation Variants */}
        <Card title="Animation Variants">
          <Space size="large">
            <div>
              <h4>Spin (Default)</h4>
              <Loading variant="spin" text="Spinning dots" />
            </div>
            <div>
              <h4>Bounce</h4>
              <Loading variant="bounce" text="Bouncing dots" />
            </div>
            <div>
              <h4>Pulse</h4>
              <Loading variant="pulse" text="Pulsing dots" />
            </div>
          </Space>
        </Card>

        {/* Color Variants */}
        <Card title="Color Variants">
          <Space size="large">
            <div>
              <h4>Green (Default)</h4>
              <Loading color="#22c55e" text="Green loading" />
            </div>
            <div>
              <h4>Blue</h4>
              <Loading color="#3b82f6" text="Blue loading" />
            </div>
            <div>
              <h4>Purple</h4>
              <Loading color="#8b5cf6" text="Purple loading" />
            </div>
            <div>
              <h4>Orange</h4>
              <Loading color="#f59e0b" text="Orange loading" />
            </div>
          </Space>
        </Card>

        {/* Overlay Loading */}
        <Card title="Overlay Loading">
          <Button 
            type="primary" 
            onClick={() => setShowOverlay(true)}
          >
            Show Overlay Loading
          </Button>
          {showOverlay && (
            <Loading 
              overlay 
              text="Loading overlay..." 
              size="large"
            />
          )}
        </Card>

        {/* Custom Styling */}
        <Card title="Custom Styling">
          <div style={{ 
            background: '#f0f0f0', 
            padding: '20px', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Loading 
              size="large"
              color="#e11d48"
              text="Custom styled loading"
              className="custom-loading"
            />
          </div>
        </Card>
      </Space>

      {/* Close overlay after 3 seconds */}
      {showOverlay && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <Loading 
            size="large"
            text="This will close in 3 seconds..."
            color="#ffffff"
          />
        </div>
      )}

      {/* Auto close overlay */}
      {showOverlay && (
        setTimeout(() => setShowOverlay(false), 3000)
      )}
    </div>
  );
};

export default LoadingDemo;
