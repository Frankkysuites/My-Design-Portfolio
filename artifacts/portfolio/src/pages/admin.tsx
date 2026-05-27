import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, Save, Plus, Upload, LogOut, KeyRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Project = {
  id: number;
  title: string;
  category: "Graphics" | "Product Design";
  description: string;
  image_url: string;
  files: any[];
};

const DEFAULT_PASSWORD = "admin123";

export default function Admin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState<Project | null>(null);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newProject, setNewProject] = useState<Project>({
    id: 0,
    title: "",
    category: "Graphics",
    description: "",
    image_url: "",
    files: [],
  });

  // Check auth on load
  useEffect(() => {
    const storedAuth = localStorage.getItem("admin_auth");
    if (storedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Load projects from Supabase
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading projects:', error);
      } else {
        setProjects(data || []);
      }
    };
    
    loadProjects();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem("admin_password") || DEFAULT_PASSWORD;
    if (password === storedPassword) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_auth", "true");
      setPassword("");
      setError("");
    } else {
      setError("Wrong password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_auth");
    setPassword("");
  };

  const handleAddProject = async () => {
    if (!newProject.title || !newProject.image_url) {
      alert("Please fill in title and image URL");
      return;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: newProject.title,
        category: newProject.category,
        description: newProject.description,
        image_url: newProject.image_url,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project');
      return;
    }
    
    setProjects([data, ...projects]);
    setIsAddingProject(false);
    setNewProject({
      id: 0,
      title: "",
      category: "Graphics",
      description: "",
      image_url: "",
      files: [],
    });
    alert('Project added successfully!');
  };

  const handleDeleteProject = async (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
        return;
      }
      setProjects(projects.filter(p => p.id !== id));
      alert('Project deleted successfully!');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
          <p className="text-sm text-gray-500 mt-4 text-center">Default password: admin123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Projects ({projects.length})</h2>
            <Button onClick={() => setIsAddingProject(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add New Project
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4 flex gap-4 items-start">
                <img src={project.image_url} alt={project.title} className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{project.title}</h3>
                  <p className="text-sm text-gray-600">{project.category}</p>
                  <p className="text-sm text-gray-500 mt-1">{project.description?.substring(0, 100)}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteProject(project.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-500">No projects yet. Click "Add New Project" to get started.</div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      <Dialog open={isAddingProject} onOpenChange={setIsAddingProject}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Add New Project</DialogTitle>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={newProject.title}
                onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                placeholder="Project title"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full border rounded-md p-2"
                value={newProject.category}
                onChange={(e) => setNewProject({...newProject, category: e.target.value as "Graphics" | "Product Design"})}
              >
                <option value="Graphics">Graphics</option>
                <option value="Product Design">Product Design</option>
              </select>
            </div>
            <div>
              <Label>Image URL *</Label>
              <Input
                value={newProject.image_url}
                onChange={(e) => setNewProject({...newProject, image_url: e.target.value})}
                placeholder="https://picsum.photos/id/20/800/600"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                rows={4}
                placeholder="Project description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingProject(false)}>Cancel</Button>
              <Button onClick={handleAddProject}>Add Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
