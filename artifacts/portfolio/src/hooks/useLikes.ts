import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useLikes(projectId: number) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('liked, count')
          .eq('project_id', projectId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
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
