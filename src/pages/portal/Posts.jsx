import React, { useState, useEffect } from 'react';
import { databases, config } from '../../lib/appwrite';
import { Query, ID } from 'appwrite';
import PortalHeader from '../../components/PortalHeader';
import {
  AiOutlinePlus,
  AiOutlineSearch,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineLoading3Quarters,
  AiOutlineClose,
  AiOutlineEnvironment,
} from 'react-icons/ai';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, sitesRes, clientsRes] = await Promise.all([
        databases.listDocuments(config.databaseId, config.postsCollectionId, [Query.orderDesc('$createdAt')]),
        databases.listDocuments(config.databaseId, config.sitesCollectionId),
        databases.listDocuments(config.databaseId, config.clientsCollectionId),
      ]);
      setPosts(postsRes.documents);
      setSites(sitesRes.documents);
      setClients(clientsRes.documents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await databases.deleteDocument(config.databaseId, config.postsCollectionId, id);
      setPosts(posts.filter((p) => p.$id !== id));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const getSiteName = (siteId) => sites.find((s) => s.$id === siteId)?.siteName || 'Unknown';
  const getClientName = (siteId) => {
    const site = sites.find((s) => s.$id === siteId);
    return clients.find((c) => c.$id === site?.clientId)?.companyName || '';
  };

  const filteredPosts = posts.filter((post) => {
    if (filterSite !== 'all' && post.siteId !== filterSite) return false;
    if (searchTerm) {
      return post.postName?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky">
        <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <PortalHeader title="Posts" description="Manage security posts and assignments" eyebrow="Post Management">
          <button
            onClick={() => { setEditingPost(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky shadow-lg hover:bg-accent/90"
          >
            <AiOutlinePlus className="h-5 w-5" />
            Add Post
          </button>
        </PortalHeader>

        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <AiOutlineSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
          >
            <option value="all">All Sites</option>
            {sites.map((s) => (
              <option key={s.$id} value={s.$id}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <div key={post.$id} className="glass-panel p-6 transition-all hover:border-accent/30">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{post.postName}</h3>
                  <p className="text-sm text-accent">{post.postType || 'Static'}</p>
                </div>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  {post.status || 'active'}
                </span>
              </div>
              <div className="mb-4 flex items-center gap-2 text-sm text-white/70">
                <AiOutlineEnvironment className="h-4 w-4 text-accent" />
                <div>
                  <p>{getSiteName(post.siteId)}</p>
                  <p className="text-xs text-white/50">{getClientName(post.siteId)}</p>
                </div>
              </div>
              {post.requirements && (
                <p className="mb-4 text-sm text-white/60">{post.requirements}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingPost(post); setIsModalOpen(true); }}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/70 hover:border-accent hover:text-accent"
                >
                  <AiOutlineEdit className="inline h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(post.$id)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/70 hover:border-red-500 hover:text-red-400"
                >
                  <AiOutlineDelete className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <PostFormModal
          post={editingPost}
          sites={sites}
          onClose={(refresh) => {
            setIsModalOpen(false);
            if (refresh) fetchData();
          }}
        />
      )}
    </div>
  );
};

const PostFormModal = ({ post, sites, onClose }) => {
  const [formData, setFormData] = useState({
    siteId: post?.siteId || '',
    postName: post?.postName || '',
    postType: post?.postType || 'Static',
    requirements: post?.requirements || '',
    riskLevel: post?.riskLevel || 'Low',
    status: post?.status || 'active',
  });
  const [loading, setLoading] = useState(false);

  const postTypes = ['Static', 'Patrol', 'Reception', 'Gatehouse', 'CCTV', 'Mobile', 'Event'];
  const riskLevels = ['Low', 'Medium', 'High'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (post) {
        await databases.updateDocument(config.databaseId, config.postsCollectionId, post.$id, formData);
      } else {
        await databases.createDocument(config.databaseId, config.postsCollectionId, ID.unique(), formData);
      }
      onClose(true);
    } catch (error) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-primary-dark to-night-sky p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{post ? 'Edit Post' : 'Add New Post'}</h2>
          <button onClick={() => onClose(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10">
            <AiOutlineClose className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">
              Site <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.siteId}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.$id} value={s.$id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Post Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.postName}
              onChange={(e) => setFormData({ ...formData, postName: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              placeholder="e.g., Gatehouse, Reception"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">Post Type</label>
              <select
                value={formData.postType}
                onChange={(e) => setFormData({ ...formData, postType: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              >
                {postTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">Risk Level</label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              >
                {riskLevels.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Requirements</label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-accent focus:outline-none"
              placeholder="Uniform, SIA licence type, skills needed..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-night-sky hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : post ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Posts;
