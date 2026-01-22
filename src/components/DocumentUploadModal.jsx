import React, { useState, useEffect } from 'react';
import { storage, databases, config } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { AiOutlineClose, AiOutlineLoading3Quarters, AiOutlineUpload, AiOutlineFile } from 'react-icons/ai';
import { useAuth } from '../context/AuthContext';

const DocumentUploadModal = ({ isOpen, onClose, onSuccess, staffId = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    documentName: '',
    documentType: 'compliance',
    description: '',
    relatedStaffId: staffId || '',
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState([]);

  const documentTypes = [
    { value: 'compliance', label: 'Compliance Document' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'license', label: 'License' },
    { value: 'policy', label: 'Policy' },
    { value: 'contract', label: 'Contract' },
    { value: 'training', label: 'Training Material' },
    { value: 'id', label: 'ID Document' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchStaffList();
      if (staffId) {
        setFormData(prev => ({ ...prev, relatedStaffId: staffId }));
      }
    }
  }, [isOpen, staffId]);

  const fetchStaffList = async () => {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.staffProfilesCollectionId,
        [Query.limit(100)]
      );
      setStaffList(response.documents || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      
      // Auto-fill document name if empty
      if (!formData.documentName) {
        setFormData(prev => ({ ...prev, documentName: selectedFile.name }));
      }
    }
  };

  const validateForm = () => {
    if (!file) {
      setError('Please select a file to upload');
      return false;
    }
    if (!formData.documentName.trim()) {
      setError('Document name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Create a bucket ID if not exists (you may need to create this in Appwrite console first)
      const bucketId = config.documentsBucketId || 'documents';

      // Upload file to Appwrite Storage
      const uploadedFile = await storage.createFile(
        bucketId,
        ID.unique(),
        file,
        // Optionally add onProgress callback
        // (progress) => {
        //   setUploadProgress(Math.round((progress.chunksUploaded / progress.chunksTotal) * 100));
        // }
      );

      // Get file URL
      const fileUrl = storage.getFileView(bucketId, uploadedFile.$id);

      // Create metadata entry in documents collection
      const documentData = {
        documentName: formData.documentName.trim(),
        documentType: formData.documentType,
        description: formData.description.trim(),
        fileId: uploadedFile.$id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: fileUrl.href,
        uploadedBy: user.$id,
        uploadedByName: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        relatedStaffId: formData.relatedStaffId || null,
        uploadedAt: new Date().toISOString(),
      };

      await databases.createDocument(
        config.databaseId,
        config.complianceUploadsCollectionId || 'documents',
        ID.unique(),
        documentData
      );

      setSuccess('Document uploaded successfully!');
      setUploadProgress(100);

      // Reset form
      setFormData({
        documentName: '',
        documentType: 'compliance',
        description: '',
        relatedStaffId: staffId || '',
      });
      setFile(null);

      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess('');
        setUploadProgress(0);
      }, 1500);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl my-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Upload Document</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messages */}
          {error && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-300">
              {success}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Select File <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-8 cursor-pointer hover:border-accent hover:bg-white/10 transition-all"
              >
                <AiOutlineUpload className="text-3xl text-accent" />
                <div className="text-center">
                  {file ? (
                    <>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-white/50 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-medium">Click to select a file</p>
                      <p className="text-sm text-white/50 mt-1">
                        PDF, DOC, DOCX, JPG, PNG (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Document Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Document Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="documentName"
                value={formData.documentName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors"
                placeholder="Enter document name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Document Type</label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Related Staff */}
          <div>
            <label className="mb-2 block text-sm text-white/70">Related Staff Member</label>
            <select
              name="relatedStaffId"
              value={formData.relatedStaffId}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none transition-colors [&>option]:bg-night-sky"
            >
              <option value="">Select staff member (optional)</option>
              {staffList.map((staff) => (
                <option key={staff.$id} value={staff.$id}>
                  {staff.firstName} {staff.lastName} - {staff.email}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm text-white/70">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-accent focus:outline-none transition-colors resize-none"
              placeholder="Add any additional notes or description..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-accent px-6 py-3 font-medium text-night-sky transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <AiOutlineLoading3Quarters className="animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload Document'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
