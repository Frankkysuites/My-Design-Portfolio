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
      
      if (/^\d+$/.test(slugOrId)) {
        query = query.eq('id', parseInt(slugOrId));
      } else {
        query = query.eq('slug', slugOrId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (!error && data) {
        setProjectId(data.id);
      }
    };
    
    fetchProjectId();
  }, [slugOrId]);

  // Check if user has already liked this project (using localStorage)
  useEffect(() => {
    if (!projectId) return;
    
    const likedKey = `liked_project_${projectId}`;
    const hasLiked = localStorage.getItem(likedKey) === 'true';
    setLiked(hasLiked);
  }, [projectId]);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!projectId) return;
      
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('count')
          .eq('project_id', projectId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching likes:', error);
          return;
        }
        
        if (data) {
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

  const addLike = async () => {
    if (!projectId) return;
    
    const likedKey = `liked_project_${projectId}`;
    
    // Check if user already liked
    if (localStorage.getItem(likedKey) === 'true') {
      console.log('User already liked this project');
      return;
    }
    
    const newCount = likeCount + 1;
    
    try {
      // Update the count (increment by 1, don't toggle)
      const { error } = await supabase
        .from('likes')
        .upsert({
          project_id: projectId,
          count: newCount
        }, { onConflict: 'project_id' });
      
      if (error) throw error;
      
      // Mark this user as having liked
      localStorage.setItem(likedKey, 'true');
      setLiked(true);
      setLikeCount(newCount);
      console.log(`✅ Liked! Total likes: ${newCount}`);
    } catch (error) {
      console.error('Failed to update like:', error);
    }
  };

  return { liked, likeCount, isLoading, addLike };
}
