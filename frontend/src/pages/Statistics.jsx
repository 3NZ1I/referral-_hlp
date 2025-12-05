import React, { useMemo, useRef } from 'react';
import { Card, Typography, Row, Col, Statistic, Progress, Button, Dropdown } from 'antd';
import {
  FileTextOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { useCases } from '../context/CasesContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


const { Title } = Typography;

const Statistics = () => {
  const { cases } = useCases();
  const contentRef = useRef(null);

  const stats = useMemo(() => {
    const totalCases = cases.length;
    const assigned = cases.filter((c) => c.assignedStaff && c.assignedStaff !== 'Unassigned').length;
    const unassigned = totalCases - assigned;

    // Status breakdown
    const statusCounts = cases.reduce((acc, c) => {
      const status = c.status || 'Pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Category breakdown (from formFields)
    const categoryCounts = {};
    cases.forEach((c) => {
      const fields = c.formFields || {};
      const categoryFields = [
        fields.law_followup5,
        fields.law_followup4,
        fields.law_followup3,
        fields.law_followup1,
        fields.eng_followup1,
      ];
      
      categoryFields.forEach((value) => {
        if (value && value !== '') {
          categoryCounts[value] = (categoryCounts[value] || 0) + 1;
        }
      });
    });

    return {
      totalCases,
      assigned,
      unassigned,
      assignedPercent: totalCases > 0 ? ((assigned / totalCases) * 100).toFixed(1) : 0,
      statusCounts,
      categoryCounts,
    };
  }, [cases]);

  const downloadTextReport = () => {
    const reportData = {
      generatedDate: new Date().toLocaleString(),
      summary: {
        totalCases: stats.totalCases,
        assignedCases: stats.assigned,
        unassignedCases: stats.unassigned,
        assignmentRate: `${stats.assignedPercent}%`,
      },
      statusBreakdown: Object.entries(stats.statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: `${((count / stats.totalCases) * 100).toFixed(1)}%`,
      })),
      categoryBreakdown: Object.entries(stats.categoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: `${((count / stats.totalCases) * 100).toFixed(1)}%`,
      })),
    };

    // Create formatted text report
    let reportText = `SYRBANISM REFERRAL SYSTEM - STATISTICS REPORT\n`;
    reportText += `Generated: ${reportData.generatedDate}\n`;
    reportText += `${'='.repeat(60)}\n\n`;
    
    reportText += `SUMMARY\n`;
    reportText += `${'─'.repeat(60)}\n`;
    reportText += `Total Cases: ${reportData.summary.totalCases}\n`;
    reportText += `Assigned Cases: ${reportData.summary.assignedCases}\n`;
    reportText += `Unassigned Cases: ${reportData.summary.unassignedCases}\n`;
    reportText += `Assignment Rate: ${reportData.summary.assignmentRate}\n\n`;
    
    reportText += `STATUS BREAKDOWN\n`;
    reportText += `${'─'.repeat(60)}\n`;
    reportData.statusBreakdown.forEach(({ status, count, percentage }) => {
      reportText += `${status.padEnd(20)} ${count.toString().padStart(5)} (${percentage})\n`;
    });
    
    reportText += `\nCATEGORY BREAKDOWN\n`;
    reportText += `${'─'.repeat(60)}\n`;
    reportData.categoryBreakdown.forEach(({ category, count, percentage }) => {
      reportText += `${category.padEnd(40)} ${count.toString().padStart(5)} (${percentage})\n`;
    });
    
    reportText += `\n${'='.repeat(60)}\n`;
    reportText += `End of Report\n`;

    // Create and download file
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistics-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPDFReport = async () => {
    if (!contentRef.current) return;

    try {
      // Capture the content as canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`statistics-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const downloadMenuItems = [
    {
      key: 'text',
      label: 'Download as Text',
      icon: <FileWordOutlined />,
      onClick: downloadTextReport,
    },
    {
      key: 'pdf',
      label: 'Download as PDF',
      icon: <FilePdfOutlined />,
      onClick: downloadPDFReport,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} style={{ margin: 0, flex: '1 1 200px', minWidth: 0 }}>Statistics Overview</Title>
        <Dropdown
          menu={{ items: downloadMenuItems }}
          placement="bottomRight"
        >
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size="large"
            style={{ flexShrink: 0 }}
          >
            Download Report
          </Button>
        </Dropdown>
      </div>
      
      <div ref={contentRef}>
      
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Cases"
              value={stats.totalCases}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Assigned Cases"
              value={stats.assigned}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Unassigned Cases"
              value={stats.unassigned}
              prefix={<UserDeleteOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Assignment Rate"
              value={stats.assignedPercent}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Assignment Progress */}
      <Card title="Assignment Progress" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Progress
              percent={parseFloat(stats.assignedPercent)}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Col>
          <Col>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {stats.assigned}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Assigned</div>
            </div>
          </Col>
          <Col>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {stats.unassigned}
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>Unassigned</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Status Breakdown */}
        <Col xs={24} lg={12}>
          <Card title={<><ClockCircleOutlined /> Status Breakdown</>}>
            {Object.keys(stats.statusCounts).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(stats.statusCounts).map(([status, count]) => {
                  const percent = ((count / stats.totalCases) * 100).toFixed(1);
                  const colors = {
                    'Pending': '#faad14',
                    'In Progress': '#1890ff',
                    'Completed': '#52c41a',
                    'On Hold': '#ff4d4f',
                    'Closed': '#8c8c8c',
                  };
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{status}</span>
                        <span style={{ fontWeight: 'bold' }}>{count} ({percent}%)</span>
                      </div>
                      <Progress
                        percent={parseFloat(percent)}
                        strokeColor={colors[status] || '#1890ff'}
                        showInfo={false}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 32 }}>
                No status data available
              </div>
            )}
          </Card>
        </Col>

        {/* Category Breakdown */}
        <Col xs={24} lg={12}>
          <Card title={<><AppstoreOutlined /> Category Breakdown</>}>
            {Object.keys(stats.categoryCounts).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(stats.categoryCounts).map(([category, count]) => {
                  const percent = ((count / stats.totalCases) * 100).toFixed(1);
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12 }}>{category}</span>
                        <span style={{ fontWeight: 'bold' }}>{count} ({percent}%)</span>
                      </div>
                      <Progress
                        percent={parseFloat(percent)}
                        strokeColor="#722ed1"
                        showInfo={false}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 32 }}>
                No category data available
              </div>
            )}
          </Card>
        </Col>
      </Row>
      </div>
    </div>
  );
};

export default Statistics;
