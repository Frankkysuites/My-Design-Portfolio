import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { 
  useGetAdminSession, 
  useAdminLogin, 
  useAdminLogout,
  useListProjects,
  useCreateProject,
  useDeleteProject,
  useRequestUploadUrl,
  getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectCategory } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, UploadCloud, LogOut, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["Graphics", "Product Design"]),
  description: z.string().min(1, "Description is required"),
});

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useGetAdminSession({
    query: { retry: false }
  });
  const isAuthenticated = session?.authenticated;

  const loginMutation = useAdminLogin();
  const logoutMutation = useAdminLogout();
  
  const { data: projects, isLoading: projectsLoading } = useListProjects({}, {
    query: { enabled: !!isAuthenticated }
  });
  
  const requestUploadUrlMutation = useRequestUploadUrl();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      category: "Graphics",
      description: "",
    },
  });

  const onLogin = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        if (res.success) {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
          toast({ title: "Welcome back", description: "Successfully logged in." });
        } else {
          toast({ title: "Login failed", description: res.message, variant: "destructive" });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Invalid password.", variant: "destructive" });
      }
    });
  };

  const onLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
        setLocation("/");
        toast({ title: "Logged out", description: "You have been logged out successfully." });
      }
    });
  };

  const onUpload = async (data: z.infer<typeof uploadSchema>) => {
    if (!file) {
      toast({ title: "Missing image", description: "Please select an image to upload.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      return;
    }
    
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPG and PNG are supported.", variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. Get presigned URL
      const { uploadURL, objectPath } = await requestUploadUrlMutation.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type,
        }
      });

      // 2. Upload file directly to object storage
      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage.");
      }

      // 3. Create project record
      await createProjectMutation.mutateAsync({
        data: {
          ...data,
          objectPath,
        }
      });

      toast({ title: "Success!", description: "Project has been published." });
      uploadForm.reset();
      setFile(null);
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });

    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", description: "There was an error creating the project.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    deleteProjectMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Project deleted", description: `"${title}" has been removed.` });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
      }
    });
  };

  if (sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!isAuthenticated || sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md shadow-xl border-none">
          <CardHeader className="space-y-3 pb-8 pt-10">
            <CardTitle className="text-3xl font-display text-center">Studio Access</CardTitle>
            <CardDescription className="text-center text-base">Enter the password to access the studio panel.</CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} className="h-12 bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 text-md" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enter Studio"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display font-semibold text-lg">Studio Panel</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} disabled={logoutMutation.isPending}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Upload Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-display font-semibold">Publish Work</h2>
            <p className="text-muted-foreground">Add a new project to your portfolio.</p>
          </div>
          
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-8">
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(onUpload)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Col: Image Upload */}
                  <div className="space-y-4">
                    <Label>Project Image</Label>
                    <div className="relative h-64 md:h-full min-h-[240px] border-2 border-dashed border-border rounded-xl bg-muted/50 hover:bg-muted transition-colors flex flex-col items-center justify-center overflow-hidden group">
                      {file ? (
                        <div className="absolute inset-0">
                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover opacity-80" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white font-medium">Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center">
                          <div className="w-12 h-12 mb-4 rounded-full bg-background flex items-center justify-center shadow-sm">
                            <UploadCloud className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="font-medium text-sm mb-1">Click to upload image</p>
                          <p className="text-xs text-muted-foreground">JPG or PNG (max. 5MB)</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setFile(e.target.files[0]);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Upload project image"
                      />
                    </div>
                  </div>

                  {/* Right Col: Details */}
                  <div className="space-y-6">
                    <FormField
                      control={uploadForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Rebrand" {...field} className="bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={"Graphics"}>Graphics</SelectItem>
                              <SelectItem value={"Product Design"}>Product Design</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the project brief, your role, and the outcome..." 
                              className="h-32 resize-none bg-background" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isUploading}>
                      {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                      {isUploading ? "Publishing..." : "Publish Project"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

        {/* List Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-display font-semibold">Published Work</h2>
            <p className="text-muted-foreground">Manage your existing portfolio pieces.</p>
          </div>

          {projectsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid gap-4">
              {projects.map((project) => (
                <div key={project.id} className="bg-background p-4 rounded-xl border border-border flex items-center gap-6 group hover:border-primary/50 transition-colors shadow-sm">
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={`/api/storage${project.objectPath}`} 
                      alt={project.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-lg truncate">{project.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground/80">{project.category}</span>
                      <span>•</span>
                      <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => onDelete(project.id, project.title)}
                    disabled={deleteProjectMutation.isPending}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
             <div className="p-12 text-center bg-background rounded-xl border border-border border-dashed">
                <p className="text-muted-foreground">No projects published yet.</p>
             </div>
          )}
        </section>
      </main>
    </div>
  );
}
