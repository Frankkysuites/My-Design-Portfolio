import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useLikes(slugOrId: string) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProjectId = async () => {
      if (!slugOrId) return;
      
      let query = supabase.from('projects').select('id');
      
      // Check if it's a number (ID) or string (slug)
      if (/^\d+$/.test(slugOrId)) {
        query = query.eq('id', parseInt(slugOrId));
      } else {
        query = query.eq('slug', slugOrId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (!error && data) {
        setProjectId(data.id);
      } else {
        console.error('Project not found:', slugOrId);
      }
    };
    
    fetchProjectId();
  }, [slugOrId]);

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
