import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Empty,
  Tag,
  Select,
  DatePicker,
  Button,
  message,
  Input,
  List,
  Avatar,
  Tooltip,
} from 'antd';
import { EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useCases } from '../context/CasesContext';
import { useAuth } from '../context/AuthContext';
import { assignCase as apiAssignCase, updateCaseApi, addComment as apiAddComment, fetchComments as apiFetchComments } from '../api';
import { formSections, selectOptions } from '../data/formMetadata';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.trim() ? value.trim().split(/\s+/) : [];
  }
  return value ? [value] : [];
};

const getOptionLabel = (optionsKey, optionValue) => {
  const catalog = selectOptions[optionsKey] || [];
  const match = catalog.find((opt) => opt.value === optionValue);
  return match ? `${match.label?.en || optionValue}${match.label?.ar ? ` / ${match.label.ar}` : ''}` : optionValue;
};

const stripFormatting = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/__+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const formatLabel = (labelValue, fallback) => stripFormatting(labelValue) || fallback;

const excelSerialToDate = (value) => {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 24 * 60 * 60 * 1000);
};

const parseDateValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = excelSerialToDate(value);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      const parsed = excelSerialToDate(numeric);
      if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatDateDisplay = (value) => {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toLocaleDateString() : '—';
};

const toDayjs = (value) => {
  const parsed = parseDateValue(value);
  return parsed ? dayjs(parsed) : null;
};

const formatFieldValue = (rawValue, field) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '—';
  }

  if (field?.optionsKey) {
    const values = field.type === 'select_multiple' ? asArray(rawValue) : [rawValue];
    if (!values.length) return '—';
    return values.map((value) => getOptionLabel(field.optionsKey, value)).join(', ');
  }

  if (field?.type === 'date') {
    return formatDateDisplay(rawValue) || rawValue;
  }

  if (field?.type === 'datetime') {
    const parsed = parseDateValue(rawValue);
    return parsed ? parsed.toLocaleString() : rawValue;
  }

  return rawValue;
};

const statusChoices = ['Pending', 'In Progress', 'Completed', 'On Hold', 'Closed'];

const rosterSlots = ['1', '2_1', '3_1', '4_1', '5_1', '6_1', '7_1'];
const rosterColumns = [
  { key: 'slotLabel', label: { ar: 'القريب/ة', en: 'Relative' }, width: '130px' },
  { key: 'relation', label: { ar: 'صلة القرابة', en: 'Kinship ties' } },
  { key: 'govreg', label: { ar: 'مسجل في الأحوال المدنية', en: 'Registered in civil registry' } },
  { key: 'name', label: { ar: 'الاسم', en: 'First name' } },
  { key: 'lastName', label: { ar: 'اللقب', en: 'Family name' } },
  { key: 'birthDate', label: { ar: 'تاريخ الميلاد', en: 'Date of birth' } },
  { key: 'nationality', label: { ar: 'الجنسية', en: 'Nationality' } },
];
const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    cases,
    updateCase,
    staffDirectory = [],
    reloadCases,
  } = useCases();
  const { currentUser, canSeeHiddenFields } = useAuth();

  const caseRecord = useMemo(() => cases.find((row) => row.key === id), [cases, id]);
  const [statusValue, setStatusValue] = useState(caseRecord?.status || 'Pending');
  const [staffValue, setStaffValue] = useState(caseRecord?.assignedStaff || '');
  // follow-up field removed from detail view per UI change
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    if (!caseRecord) return;
    setStatusValue(caseRecord.status || 'Pending');
    setStaffValue(caseRecord.assignedStaff || '');
  }, [caseRecord]);

  useEffect(() => {
    // When navigating to a case or reloading case details, ensure freshest data
    reloadCases();
  }, [id, reloadCases]);

  // Load comments for server-backed cases
  useEffect(() => {
    const loadComments = async () => {
      if (!caseRecord || !caseRecord.id) return;
      try {
        const c = await apiFetchComments(caseRecord.id);
        const mapped = (c || []).map((cm) => ({
          id: String(cm.id),
          text: cm.content,
          author: cm.user?.name || cm.user_id || 'Unknown User',
          timestamp: cm.created_at,
        }));
        await updateCase(caseRecord.key, { comments: mapped });
      } catch (err) {
        console.warn('Failed to load comments for case', err);
      }
    };
    loadComments();
  }, [caseRecord?.id]);

  // compute category & staff options early so hooks are not conditionally executed
  const categoryValue = useMemo(() => {
    const fields = caseRecord?.formFields || {};
    const categoryFieldMap = [
      { field: 'eng_followup1', optionsKey: 'sj0rz77' },
      { field: 'law_followup3', optionsKey: 'sj0lw91' },
      { field: 'law_followup4', optionsKey: 'sj0lw92' },
      { field: 'law_followup5', optionsKey: 'sj0lw93' },
    ];
    for (const { field, optionsKey } of categoryFieldMap) {
      const value = fields[field];
      if (value && value !== '') {
        return getOptionLabel(optionsKey, value);
      }
    }
    return '—';
  }, [caseRecord?.formFields]);

  const staffOptions = useMemo(() => {
    const existing = staffDirectory || [];
    const options = [{ id: '', name: 'Unassigned' }, ...existing];
    if (caseRecord?.assignedStaff && !existing.some((staff) => staff.name === caseRecord.assignedStaff)) {
      options.push({ id: 'custom', name: caseRecord.assignedStaff });
    }
    return options;
  }, [caseRecord?.assignedStaff, staffDirectory]);

  if (!caseRecord) {
    return (
      <Card className="card-panel">
        <Empty description="Case not found">
          <button className="ghost-btn" onClick={() => navigate('/cases')}>Back to list</button>
        </Empty>
      </Card>
    );
  }

  const submissionDate = caseRecord.submissionDate
    || caseRecord.raw?._submission_time
    || caseRecord.raw?.submissiontime
    || caseRecord.formFields?.today
    || caseRecord.raw?.submissiondate
    || caseRecord.raw?.end
    || caseRecord.raw?.start
    || caseRecord.raw?.created_at;

  // Compute category from referral/followup fields

  const isDirty = statusValue !== (caseRecord.status || '') || staffValue !== (caseRecord.assignedStaff || '');

  const handleSave = async () => {
    if (!caseRecord) return;
    try {
      setSaving(true);
      // Require a resolve comment when changing status to a resolved state
      const resolvedStates = ['Completed', 'Closed'];
      const statusWillBeResolved = resolvedStates.includes(statusValue);
      if (statusWillBeResolved && !commentText.trim()) {
        message.error('Please add a resolve comment before resolving the case');
        setSaving(false);
        return;
      }
      // If resolving and we have a comment text, add it before changing status
      const resolveCommentLocal = commentText.trim();
      if (statusWillBeResolved && resolveCommentLocal) {
        try {
          if (caseRecord.id) {
            await apiAddComment(caseRecord.id, commentText.trim());
          } else {
            // local fallback: add comment to local state
            const newComment = {
              id: Date.now().toString(),
              text: commentText.trim(),
              author: currentUser?.username || 'Unknown User',
              timestamp: new Date().toISOString(),
            };
            const existingComments = caseRecord.comments || [];
            await updateCase(caseRecord.key, { comments: [...existingComments, newComment] });
          }
          setCommentText('');
        } catch (err) {
          console.warn('Failed to persist resolve comment before resolving case', err);
        }
      }
      await updateCase(caseRecord.key, {
        status: statusValue,
        assignedStaff: staffValue || 'Unassigned',
      });
      // Persist assignment to backend if this case exists on server
      if (caseRecord.id) {
        // Persist status change as well as assignment
        try {
            const payload = {
              title: caseRecord.title,
              description: caseRecord.raw?.description || caseRecord.notes || '',
              status: statusValue,
            };
            // If resolving, include resolve_comment to satisfy backend validation
            if (statusWillBeResolved && resolveCommentLocal) {
              payload.resolve_comment = resolveCommentLocal;
            }
            await updateCaseApi(caseRecord.id, payload);
        } catch (err) {
          console.warn('Failed to persist case update to backend', err);
        }
        try {
          const assignResp = await apiAssignCase(caseRecord.id, staffValue || null, null);
          // Update local state with assigned staff returned by backend
          if (assignResp && assignResp.assigned_to) {
            await updateCase(caseRecord.key, { assignedStaff: assignResp.assigned_to.name });
          } else if (assignResp && assignResp.assigned_to_id && staffValue) {
            // fallback: update with selected staffName
            await updateCase(caseRecord.key, { assignedStaff: staffValue || 'Unassigned' });
          }
        } catch (err) {
          console.warn('Failed to persist assignment to backend', err);
        }
      }
      message.success('Case details updated');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      message.warning('Please enter a comment');
      return;
    }
    
    try {
      setAddingComment(true);
      // Persist comment to backend when case exists on server
      if (caseRecord.id) {
        const srv = await apiAddComment(caseRecord.id, commentText.trim());
        const author = srv.user?.name || srv.user_id || currentUser?.username || 'Unknown User';
        const serverComment = {
          id: String(srv.id),
          text: srv.content,
          author,
          timestamp: srv.created_at,
        };
        const existingComments = caseRecord.comments || [];
        await updateCase(caseRecord.key, {
          comments: [...existingComments, serverComment],
        });
      } else {
        // Local-only fallback
        const newComment = {
          id: Date.now().toString(),
          text: commentText.trim(),
          author: currentUser?.username || 'Unknown User',
          timestamp: new Date().toISOString(),
        };
        const existingComments = caseRecord.comments || [];
        await updateCase(caseRecord.key, {
          comments: [...existingComments, newComment],
        });
      }
      setCommentText('');
      message.success('Comment added successfully');
    } catch (err) {
      console.error('Failed to add comment', err);
      message.error('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Special action for explicit Resolve flow (Resolve Now button) that adds a resolve comment and updates status
  const handleResolveNow = async () => {
    if (!commentText.trim()) {
      message.error('Please enter a resolve comment');
      return;
    }
    try {
      setSaving(true);
      // persist comment then update status
      if (caseRecord.id) {
        await apiAddComment(caseRecord.id, commentText.trim());
      } else {
        const newComment = { id: Date.now().toString(), text: commentText.trim(), author: currentUser?.username || 'Unknown User', timestamp: new Date().toISOString() };
        await updateCase(caseRecord.key, { comments: [ ...(caseRecord.comments || []), newComment ] });
      }
      // Update status with resolve_comment body to satisfy backend
      await updateCase(caseRecord.key, { status: statusValue });
      if (caseRecord.id) {
        await updateCaseApi(caseRecord.id, { title: caseRecord.title, description: caseRecord.raw?.description || caseRecord.notes || '', status: statusValue, resolve_comment: commentText.trim() });
      }
      setCommentText('');
      message.success('Case resolved and comment added');
    } catch (err) {
      console.error('Failed to resolve case', err);
      message.error('Failed to resolve case');
    } finally {
      setSaving(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editCommentText.trim()) {
      message.warning('Comment cannot be empty');
      return;
    }

    try {
      const existingComments = caseRecord.comments || [];
      const updatedComments = existingComments.map((comment) =>
        comment.id === commentId
          ? { ...comment, text: editCommentText.trim(), edited: true }
          : comment
      );
      
      await updateCase(caseRecord.key, {
        comments: updatedComments,
      });
      
      setEditingCommentId(null);
      setEditCommentText('');
      message.success('Comment updated successfully');
    } catch (err) {
      console.error('Failed to update comment', err);
      message.error('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const summaryFields = [
    {
      key: 'caseNumber',
      label: 'Case Number',
      render: () => <Text strong style={{ display: 'block', marginTop: 4 }}>{caseRecord.caseNumber}</Text>,
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <Select
          showSearch
          value={statusValue}
          onChange={setStatusValue}
          options={statusChoices.map((status) => ({ label: status, value: status }))}
          style={{ width: '100%', marginTop: 4 }}
        />
      ),
    },
    {
      key: 'assignedStaff',
      label: 'Assigned Staff',
      render: () => (
        <Select
          showSearch
          value={staffValue}
          onChange={setStaffValue}
          options={staffOptions.map((staff) => ({ label: staff.name, value: staff.name }))}
          style={{ width: '100%', marginTop: 4 }}
          placeholder="Select staff"
        />
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: () => {
        if (categoryValue === '—') {
          return <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>—</Text>;
        }
        return <Text strong style={{ display: 'block', marginTop: 4 }}>{categoryValue}</Text>;
      },
    },
    // Follow-up date removed from detail UI
    {
      key: 'submissionDate',
      label: 'Submission Date',
      render: () => (
        <Text strong style={{ display: 'block', marginTop: 4 }}>{formatDateDisplay(submissionDate)}</Text>
      ),
    },
  ];

  const formFieldMap = caseRecord.formFields || {};

  const renderFamilyRosterSection = (section) => {
    const getFieldDef = (fieldName) => section.fields.find((field) => field.name === fieldName);
    const headerNoteField = section.fields.find((field) => field.name === 'group_fj2tt69_header_note');
    const bilingualInstruction = {
      ar: formatLabel(headerNoteField?.label?.ar, 'الرجاء إدخال معلومات أفراد العائلة'),
      en: formatLabel(headerNoteField?.label?.en, 'Please enter family member information'),
    };

    // If formFields.family array exists, build rows from the array (legacy n8n or Kobo roster arrays)
    const ffFamily = (caseRecord.formFields && caseRecord.formFields.family) || (caseRecord.raw && caseRecord.raw.family);
    const rows = Array.isArray(ffFamily) ? ffFamily.map((member, memberIndex) => {
      const slot = (member && member.slot) || (memberIndex + 1);
      return {
        key: slot,
        slotLabel: slot,
        relation: (() => {
          // If we have a slot and a field def, format select labels using form metadata
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner_relation1`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.relation || member.relationship || member.relation1 || '', fieldDef);
          } catch (e) {
            return member.relation || member.relationship || member.relation1 || '';
          }
        })(),
        govreg: (() => {
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner_govreg`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.govreg || '', fieldDef);
          } catch (e) {
            return member.govreg || '';
          }
        })(),
        name: (() => {
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner_name`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.name || member.beneficiary_name || '', fieldDef);
          } catch (e) {
            return member.name || member.beneficiary_name || '';
          }
        })(),
        lastName: (() => {
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner_lastname`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.lastname || member.last_name || member.family_name || '', fieldDef);
          } catch (e) {
            return member.lastname || member.last_name || member.family_name || '';
          }
        })(),
        birthDate: (() => {
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.birthDate || member.birthday || member.date_of_birth || '', fieldDef);
          } catch (e) {
            return member.birthDate || member.birthday || member.date_of_birth || '';
          }
        })(),
        nationality: (() => {
          try {
            const fieldName = `group_fj2tt69_partnernu1_${slot}_partner_nationality`;
            const fieldDef = getFieldDef(fieldName);
            return formatFieldValue(member.nationality || '', fieldDef);
          } catch (e) {
            return member.nationality || '';
          }
        })(),
      };
    }).filter(Boolean) : rosterSlots
      .map((slot, slotIndex) => {
        const prefix = `group_fj2tt69_partnernu1_${slot}_partner`;
        const relationKey = `${prefix}_relation1`;
        const govregKey = `${prefix}_govreg`;
        const nameKey = `${prefix}_name`;
        const lastNameKey = `${prefix}_lastname`;
        const birthDateKey = prefix;
        const nationalityKey = `${prefix}_nationality`;

        const row = {
          key: slot,
          slotLabel: slotIndex + 1,
          relation: formatFieldValue(formFieldMap[relationKey], getFieldDef(relationKey)),
          govreg: formatFieldValue(formFieldMap[govregKey], getFieldDef(govregKey)),
          name: formatFieldValue(formFieldMap[nameKey], getFieldDef(nameKey)),
          lastName: formatFieldValue(formFieldMap[lastNameKey], getFieldDef(lastNameKey)),
          birthDate: formatFieldValue(formFieldMap[birthDateKey], getFieldDef(birthDateKey)),
          nationality: formatFieldValue(formFieldMap[nationalityKey], getFieldDef(nationalityKey)),
        };

        const hasData = rosterColumns
          .filter((column) => column.key !== 'slotLabel')
          .some((column) => row[column.key] && row[column.key] !== '—');
        return hasData ? row : null;
      })
      .filter(Boolean);

    const extraFields = section.fields.filter((field) => {
      if (field.hidden && !canSeeHiddenFields) return false;
      if (field.type === 'note') return false;
      return !field.name.startsWith('group_fj2tt69_partnernu1_');
    });

    return (
      <>
        <div className="roster-table__wrapper">
          {rows.length ? (
            <div className="roster-table__scroll">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th colSpan={rosterColumns.length} className="roster-table__instruction">
                      <span>{bilingualInstruction.ar}</span>
                      <span>{bilingualInstruction.en}</span>
                    </th>
                  </tr>
                  <tr>
                    {rosterColumns.map((column) => (
                      <th key={column.key} style={{ width: column.width }}>
                        <span className="roster-table__header-ar">{column.label.ar}</span>
                        <span className="roster-table__header-en">{column.label.en}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      {rosterColumns.map((column) => {
                        const value = row[column.key];
                        const cellContent = column.key === 'slotLabel'
                          ? (
                              <div className="roster-table__slot">
                                <span className="roster-table__slot-number">{String(value).padStart(2, '0')}</span>
                                <span className="roster-table__slot-text roster-table__slot-text-ar">{column.label.ar}</span>
                                <span className="roster-table__slot-text">{column.label.en}</span>
                              </div>
                            )
                          : (value || '—');
                        return (
                          <td key={`${column.key}-${row.key}`} data-label={column.label.en}>
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="roster-table__empty">
              <Text type="secondary">No family roster entries captured.</Text>
            </div>
          )}
        </div>

        {extraFields.length > 0 && (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {extraFields.map((field) => (
              <div key={field.name} style={{ padding: 16, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Text strong>{formatLabel(field.label?.en, field.name)}</Text>
                  {field.label?.ar && <Text type="secondary" style={{ fontSize: 12 }}>{formatLabel(field.label.ar, '')}</Text>}
                </div>
                <Text style={{ display: 'block', marginTop: 8 }}>{formatFieldValue(formFieldMap[field.name], field)}</Text>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderDefaultSection = (section) => {
    // Filter hidden fields if user doesn't have permission
    const visibleFields = section.fields.filter((field) => {
      if (field.hidden && !canSeeHiddenFields) {
        return false;
      }
      // Hide 'note' type fields on the case detail cards; they should still be available in the table/list headers
      if (field.type === 'note') {
        return false;
      }
      return true;
    });

    return (
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {visibleFields.map((field) => {
          const value = formatFieldValue(formFieldMap[field.name], field);
          return (
            <div key={field.name} style={{ padding: 16, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Text strong>{formatLabel(field.label?.en, field.name)}</Text>
                {field.label?.ar && <Text type="secondary" style={{ fontSize: 12 }}>{formatLabel(field.label.ar, '')}</Text>}
              </div>
              <Text style={{ display: 'block', marginTop: 8 }}>{value}</Text>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card className="card-panel" bodyStyle={{ padding: 24 }}>
        <div className="panel-header">
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }}>Case {caseRecord.caseNumber}</Title>
            <Paragraph type="secondary" style={{ marginTop: 4 }}>
              Detailed capture of the intake form using the latest metadata schema.
            </Paragraph>
          </div>
          <Space className="panel-actions" wrap style={{ flexShrink: 0 }}>
            <button className="ghost-btn" onClick={() => navigate('/cases')}>Back to list</button>
            <Button type="primary" disabled={!isDirty} loading={saving} onClick={handleSave}>Save</Button>
            <Tag color={(statusValue || '').toLowerCase().includes('complete') ? 'cyan' : 'blue'}>{statusValue}</Tag>
          </Space>
        </div>
        <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 24 }}>
          {summaryFields.map((field) => (
            <div key={field.key} style={{ padding: 16, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{field.label}</Text>
              {field.render()}
            </div>
          ))}
        </div>
      </Card>

      {/* Comments moved below the top metadata card (main par / table) */}
      <Card className="card-panel" bodyStyle={{ padding: 24 }}>
        <Title level={5} style={{ marginTop: 0 }}>Comments</Title>
        <Paragraph type="secondary" style={{ marginTop: 4 }}>
          Add notes and comments about this case
        </Paragraph>
        {caseRecord.comments && caseRecord.comments.length > 0 && (
          <List
            itemLayout="horizontal"
            dataSource={caseRecord.comments}
            style={{ marginBottom: 24 }}
            renderItem={(comment) => (
              <List.Item
                actions={
                  comment.author === (currentUser?.username || 'Unknown User') && editingCommentId !== comment.id
                    ? [
                        <Tooltip title="Edit comment">
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleEditComment(comment)}
                          />
                        </Tooltip>,
                      ]
                    : editingCommentId === comment.id
                    ? [
                        <Tooltip title="Save">
                          <Button
                            type="text"
                            icon={<SaveOutlined />}
                            size="small"
                            onClick={() => handleSaveEdit(comment.id)}
                          />
                        </Tooltip>,
                        <Tooltip title="Cancel">
                          <Button
                            type="text"
                            icon={<CloseOutlined />}
                            size="small"
                            onClick={handleCancelEdit}
                          />
                        </Tooltip>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ backgroundColor: '#1890ff' }}>{comment.author.charAt(0).toUpperCase()}</Avatar>}
                  title={
                    <Space>
                      <Text strong>{comment.author}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(comment.timestamp).toLocaleString()}
                        {comment.edited && ' (edited)'}
                      </Text>
                    </Space>
                  }
                  description={
                    editingCommentId === comment.id ? (
                      <TextArea
                        rows={3}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      comment.text
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <TextArea
            rows={4}
            placeholder="Enter your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {/* Show Resolve Now when a resolved state is selected */}
            {['Completed', 'Closed'].includes(statusValue) && (
              <Button
                type="primary"
                onClick={handleResolveNow}
                loading={saving}
                disabled={!commentText.trim()}
                danger
              >
                Resolve Now
              </Button>
            )}
            <Button
              type="default"
              onClick={handleAddComment}
              loading={addingComment}
              disabled={!commentText.trim()}
            >
              Add Comment
            </Button>
          </div>
        </Space>
      </Card>

      {formSections.length > 0 && (
        <>
          {/* Render the first section */}
          <Card key={formSections[0].id} className="card-panel" bodyStyle={{ padding: 24 }}>
            <Title level={5} style={{ marginTop: 0 }}>{formSections[0].title}</Title>
            <Paragraph type="secondary" style={{ marginTop: 4 }}>{formSections[0].description}</Paragraph>
            {formSections[0].id === 'familyRoster' ? renderFamilyRosterSection(formSections[0]) : renderDefaultSection(formSections[0])}
          </Card>

          {/* comments moved earlier below top metadata card; removed here */}

          {/* Render the remaining sections (skip the first, we already rendered it above) */}
          {formSections.slice(1).map((section) => (
            <Card key={section.id} className="card-panel" bodyStyle={{ padding: 24 }}>
              <Title level={5} style={{ marginTop: 0 }}>{section.title}</Title>
              <Paragraph type="secondary" style={{ marginTop: 4 }}>{section.description}</Paragraph>
              {section.id === 'familyRoster' ? renderFamilyRosterSection(section) : renderDefaultSection(section)}
            </Card>
          ))}
        </>
      )}

      {/* Comments moved up under the first section; bottom duplicate removed */}

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button type="primary" disabled={!isDirty} loading={saving} onClick={handleSave}>Save</Button>
      </Space>
    </Space>
  );
};

export default CaseDetails;
