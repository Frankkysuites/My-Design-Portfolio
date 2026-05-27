import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useListProjects(params?: { category?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        let query = supabase.from('projects').select('*');
        
        if (params?.category && params.category !== "All") {
          query = query.eq('category', params.category);
        }
        
        const { data: projects, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        setData(projects || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
  }, [params?.category]);

  return { data, isLoading };
}

export type ProjectCategory = "Graphics" | "Product Design";
