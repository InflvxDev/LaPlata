import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private static instance: SupabaseClient;

  constructor() {
    if (!SupabaseService.instance) {
      SupabaseService.instance = createClient(
        environment.supabaseUrl, 
        environment.supabaseKey
      );
    }
  }

  get client(): SupabaseClient {
    return SupabaseService.instance;
  }
}
