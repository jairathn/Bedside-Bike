import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  Users,
  Building,
  Home,
  Stethoscope,
  FileCheck,
  AlertCircle,
  Pen,
  Eye,
  RefreshCw,
  Calendar,
  ClipboardList
} from "lucide-react";

interface InsuranceReport {
  id: number;
  patientId: number;
  reportType: 'snf' | 'home_health' | 'outpatient_pt';
  insuranceType?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'submitted';
  generatedAt: string;
  approvedAt?: string;
  approvedBy?: number;
  criteriaEvaluation: {
    criterionName: string;
    met: boolean;
    evidence: string;
  }[];
  recommendation: string;
  content: string;
}

const reportTypes = [
  { value: 'snf', label: 'Skilled Nursing Facility (SNF)', icon: Building, description: 'For patients requiring SNF-level care' },
  { value: 'home_health', label: 'Home Health', icon: Home, description: 'For patients transitioning to home with services' },
  { value: 'outpatient_pt', label: 'Outpatient PT', icon: Stethoscope, description: 'For continued outpatient physical therapy' },
];

export default function InsuranceReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<InsuranceReport | null>(null);
  const [signature, setSignature] = useState('');

  // Get patients
  const { data: patients = [] } = useQuery({
    queryKey: [`/api/providers/${user?.id}/patients`],
    enabled: !!user && user.userType === 'provider',
  });

  // Get patient's insurance reports
  const { data: reports = [], refetch: refetchReports } = useQuery<InsuranceReport[]>({
    queryKey: [`/api/patients/${selectedPatientId}/insurance-reports`],
    enabled: !!selectedPatientId,
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: { patientId: number; reportType: string }) => {
      return await apiRequest(`/api/patients/${data.patientId}/insurance-report`, {
        method: 'POST',
        body: JSON.stringify({
          reportType: data.reportType,
          generatedBy: user?.id,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/insurance-reports`] });
      toast({
        title: "Report Generated",
        description: "Insurance authorization report has been created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  // Approve report mutation
  const approveReportMutation = useMutation({
    mutationFn: async (data: { reportId: number; signature: string }) => {
      return await apiRequest(`/api/insurance-reports/${data.reportId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          approvedBy: user?.id,
          signature: data.signature,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${selectedPatientId}/insurance-reports`] });
      setShowApproveDialog(false);
      setSelectedReport(null);
      setSignature('');
      toast({
        title: "Report Approved",
        description: "Report has been signed and approved",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending_approval': return 'bg-yellow-500';
      case 'submitted': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending_approval': return <Clock className="w-4 h-4" />;
      case 'submitted': return <FileCheck className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getReportTypeIcon = (type: string) => {
    const reportType = reportTypes.find(r => r.value === type);
    return reportType ? reportType.icon : FileText;
  };

  const downloadPDF = async (reportId: number) => {
    try {
      const response = await fetch(`/api/patients/${selectedPatientId}/insurance-report/${reportId}/pdf`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: "Your PDF report is downloading",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the PDF report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            Insurance Authorization Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Generate and manage insurance authorization documentation
          </p>
        </div>

        {/* Patient Selection */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(v) => setSelectedPatientId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPatientId && (
                <Button variant="outline" onClick={() => refetchReports()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPatientId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Generate New Report */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" />
                    Generate New Report
                  </CardTitle>
                  <CardDescription>
                    Create insurance authorization documentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedReportType === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedReportType(type.value)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedReportType === type.value ? 'bg-blue-500 text-white' : 'bg-gray-100'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    className="w-full"
                    onClick={() => {
                      if (selectedPatientId && selectedReportType) {
                        generateReportMutation.mutate({
                          patientId: selectedPatientId,
                          reportType: selectedReportType,
                        });
                      }
                    }}
                    disabled={!selectedReportType || generateReportMutation.isPending}
                  >
                    {generateReportMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Reports</span>
                      <span className="font-bold">{reports.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pending Approval</span>
                      <Badge variant="outline" className="bg-yellow-50">
                        {reports.filter(r => r.status === 'pending_approval').length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Approved</span>
                      <Badge variant="outline" className="bg-green-50">
                        {reports.filter(r => r.status === 'approved').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileCheck className="w-5 h-5 mr-2" />
                    Generated Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.length > 0 ? (
                    <div className="space-y-4">
                      {reports.map((report) => {
                        const TypeIcon = getReportTypeIcon(report.reportType);
                        return (
                          <div key={report.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <TypeIcon className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                  <h3 className="font-medium">
                                    {reportTypes.find(r => r.value === report.reportType)?.label}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(report.generatedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <Badge className={`${getStatusColor(report.status)} flex items-center gap-1`}>
                                {getStatusIcon(report.status)}
                                {report.status.replace('_', ' ')}
                              </Badge>
                            </div>

                            {/* Criteria Evaluation Summary */}
                            {report.criteriaEvaluation && (
                              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                                <div className="text-sm font-medium mb-2">Criteria Evaluation:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {report.criteriaEvaluation.slice(0, 4).map((criterion, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      {criterion.met ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                      )}
                                      <span className={criterion.met ? 'text-green-700' : 'text-red-700'}>
                                        {criterion.criterionName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommendation */}
                            {report.recommendation && (
                              <div className="mb-3 text-sm">
                                <span className="font-medium">Recommendation:</span>{' '}
                                <span className="text-gray-600">{report.recommendation}</span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => downloadPDF(report.id)}>
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              {report.status === 'draft' || report.status === 'pending_approval' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setShowApproveDialog(true);
                                  }}
                                >
                                  <Pen className="w-4 h-4 mr-1" />
                                  Sign & Approve
                                </Button>
                              ) : null}
                            </div>

                            {/* Approval Info */}
                            {report.approvedAt && (
                              <div className="mt-3 pt-3 border-t text-sm text-gray-500">
                                Approved on {new Date(report.approvedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">
                        No Reports Generated
                      </h3>
                      <p className="text-gray-500">
                        Select a report type and click "Generate Report" to create documentation
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Select a Patient
              </h3>
              <p className="text-gray-500">
                Choose a patient to view and generate insurance reports
              </p>
            </CardContent>
          </Card>
        )}

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Pen className="w-5 h-5 mr-2" />
                Sign and Approve Report
              </DialogTitle>
              <DialogDescription>
                By signing, you certify that this report is accurate and complete
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Report Type:</div>
                <div className="font-medium">
                  {reportTypes.find(r => r.value === selectedReport?.reportType)?.label}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Electronic Signature</label>
                <Textarea
                  placeholder="Type your full name as signature..."
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  By typing your name, you agree this serves as your electronic signature
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedReport && signature) {
                    approveReportMutation.mutate({
                      reportId: selectedReport.id,
                      signature,
                    });
                  }
                }}
                disabled={!signature || approveReportMutation.isPending}
              >
                {approveReportMutation.isPending ? "Approving..." : "Sign & Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
