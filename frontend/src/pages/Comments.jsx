import React, { useState } from 'react';
import { Card, List, Input, Button } from 'antd';

const initialComments = [
  { user: 'John Doe', text: 'Initial case review complete.' },
  { user: 'Jane Smith', text: 'Awaiting client feedback.' },
];

const Comments = () => {
  const [comments, setComments] = useState(initialComments);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      setComments([...comments, { user: 'You', text: input }]);
      setInput('');
    }
  };

  return (
    <Card title="Comments" bordered={false}>
      <List
        dataSource={comments}
        renderItem={item => (
          <List.Item>
            <strong>{item.user}:</strong> {item.text}
          </List.Item>
        )}
        style={{ marginBottom: 16 }}
      />
      <Input.TextArea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={2}
        placeholder="Add a comment..."
        style={{ marginBottom: 8 }}
      />
      <Button type="primary" onClick={handleAdd}>Add Comment</Button>
    </Card>
  );
};

export default Comments;
