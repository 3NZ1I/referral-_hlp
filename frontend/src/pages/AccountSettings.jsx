import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Paragraph } = Typography;

const AccountSettings = () => {
  const { currentUser, updateUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (values) => {
    setLoading(true);
    try {
      const updates = {
        email: values.email,
        title: values.title,
        organization: values.organization,
        avatar: values.avatar,
      };

      // Only update password if provided
      if (values.newPassword) {
        if (values.newPassword !== values.confirmPassword) {
          message.error('Passwords do not match');
          setLoading(false);
          return;
        }
        updates.password = values.newPassword;
        // If user is changing their password, clear must_change_password
        updates.must_change_password = false;
      }

      updateUser(currentUser.id, updates);
      message.success('Account settings updated successfully');
      form.resetFields(['newPassword', 'confirmPassword']);
    } catch (err) {
      console.error('Failed to update account settings:', err);
      message.error('Failed to update account settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-panel">
      <Title level={4} style={{ marginTop: 0 }}>Account Settings</Title>
      <Paragraph type="secondary" style={{ marginTop: 4 }}>
        Update your profile details, email, and password
      </Paragraph>

      <div style={{ maxWidth: 600, marginTop: 32 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: currentUser?.name,
            username: currentUser?.username,
            email: currentUser?.email,
            title: currentUser?.title,
            organization: currentUser?.organization,
            avatar: currentUser?.avatar,
          }}
        >
                    <Form.Item label="Title" name="title">
                      <Input placeholder="e.g., Case Worker" />
                    </Form.Item>

                    <Form.Item label="Organization" name="organization">
                      <Input placeholder="e.g., HLP" />
                    </Form.Item>

                    <Form.Item
                      label="Avatar URL"
                      name="avatar"
                      rules={[
                        {
                          validator: (_, value) => {
                              if (!value) return Promise.resolve();
                              try {
                                new URL(value);
                                return Promise.resolve();
                              } catch {
                                return Promise.reject(new Error('Please enter a valid URL'));
                              }
                            },
                        },
                      ]}
                    >
                      <Input placeholder="https://example.com/me.jpg" />
                    </Form.Item>

          <Form.Item label="Name">
            <Input
              prefix={<UserOutlined />}
              value={currentUser?.name}
              disabled
            />
          </Form.Item>

          <Form.Item label="Username">
            <Input
              prefix={<UserOutlined />}
              value={currentUser?.username}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
            />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[({ getFieldValue }) => ({
              validator(_, value) {
                if (!value) return Promise.resolve();
                const hasMin = value.length >= 8;
                const hasLower = /[a-z]/.test(value);
                const hasUpper = /[A-Z]/.test(value);
                const hasDigitOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(value);
                if (hasMin && hasLower && hasUpper && hasDigitOrSymbol) return Promise.resolve();
                return Promise.reject(new Error('New password must be at least 8 chars, include uppercase, lowercase, and a digit or symbol'));
              }
            })]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Leave blank to keep current password"
            />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!getFieldValue('newPassword') || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Settings
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default AccountSettings;
