import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileText, Database, BookOpen, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function DataManagement() {
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/export/csv');
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      a.download = `reading_journal_backup_${dateStr}.csv`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Your reading journal has been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your reading journal",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "No data provided",
        description: "Please paste CSV data to import",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);
      const response = await apiRequest("POST", "/api/import/csv", {
        csvData: importData
      });
      const result = await response.json() as { results: { books: { created: number; updated: number; errors: number }; sessions: { created: number; errors: number } } };
      
      toast({
        title: "Import successful",
        description: `Created ${result.results.books.created} books, updated ${result.results.books.updated} books, and created ${result.results.sessions.created} reading sessions`,
      });
      
      setImportData("");
      
      // Refresh the page to show imported data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import CSV data. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    try {
      setIsClearing(true);
      const response = await apiRequest("DELETE", "/api/clear-all-data");
      const result = await response.json() as { message: string; deleted: { books: number; sessions: number } };
      
      toast({
        title: "Data cleared successfully",
        description: `Deleted ${result.deleted.books} books and ${result.deleted.sessions} reading sessions`,
      });
      
      // Refresh the page to show cleared state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: "Clear failed",
        description: "Failed to clear all data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-primary">BookFlow</h1>
              <span className="text-gray-400">|</span>
              <h2 className="text-lg text-gray-600">Data Management</h2>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Page Description */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
            <p className="text-gray-600">Backup and restore your reading journal data using CSV files</p>
          </div>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download all your books and reading sessions as a CSV file for backup purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Database className="w-4 h-4" />
                  <span>Includes all books, reading sessions, and progress data</span>
                </div>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                >
                  {isExporting ? (
                    <>
                      <FileText className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Restore your reading journal from a CSV backup file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* Manual Paste */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Paste CSV Data
                  </label>
                  <Textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your CSV data here..."
                    className="min-h-32"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <FileText className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Import Guidelines:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>Existing books with same title and author will be updated</li>
                      <li>New books will be created automatically</li>
                      <li>Duplicate reading sessions will be skipped</li>
                      <li>The page will refresh after successful import</li>
                    </ul>
                  </div>
                </div>

                <Button 
                  onClick={handleImport}
                  disabled={isImporting || !importData.trim()}
                  className="w-full sm:w-auto"
                >
                  {isImporting ? (
                    <>
                      <Database className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import from CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Clear All Data Section */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Clear All Data
              </CardTitle>
              <CardDescription>
                Permanently delete all books and reading sessions from your journal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Warning:</p>
                    <p className="mt-1">This action cannot be undone. All your books, reading sessions, and progress data will be permanently deleted. Make sure to export your data first if you want to keep a backup.</p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={isClearing}
                      className="w-full sm:w-auto"
                    >
                      {isClearing ? (
                        <>
                          <Database className="w-4 h-4 mr-2 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear All Data
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your books, reading sessions, and progress data from your reading journal.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearAllData}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, clear all data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}