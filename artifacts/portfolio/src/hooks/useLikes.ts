import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useLikes(slug: string) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<number | null>(null);

  // First fetch project ID from slug
  useEffect(() => {
    const fetchProjectId = async () => {
      if (!slug) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!error && data) {
        setProjectId(data.id);
      }
    };
    
    fetchProjectId();
  }, [slug]);

  // Then fetch likes using project ID
  useEffect(() => {
    const fetchLikes = async () => {
      if (!projectId) return;
      
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('liked, count')
          .eq('project_id', projectId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching likes:', error);
          return;
        }
        
        if (data) {
          setLiked(data.liked || false);
          setLikeCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch likes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLikes();
  }, [projectId]);

  const toggleLike = async () => {
    if (!projectId) return;
    
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    try {
      const { error } = await supabase
        .from('likes')
        .upsert({
          project_id: projectId,
          liked: newLiked,
          count: newCount
        }, { onConflict: 'project_id' });
      
      if (error) throw error;
      
      setLiked(newLiked);
      setLikeCount(newCount);
    } catch (error) {
      console.error('Failed to update like:', error);
    }
  };

  return { liked, likeCount, isLoading, toggleLike };
}
