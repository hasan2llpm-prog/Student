-- Student 2.1.0 Beta: Stories V2 editor metadata.
-- Safe additive migration; existing stories keep backward-compatible defaults.
alter table if exists public.stories
    add column if not exists overlay_text text not null default '',
    add column if not exists overlay_text_color text not null default '#FFFFFF',
    add column if not exists overlay_background boolean not null default true,
    add column if not exists overlay_position text not null default 'center',
    add column if not exists media_filter text not null default 'normal',
    add column if not exists crop_mode text not null default 'original';

alter table if exists public.stories
    drop constraint if exists stories_overlay_position_check,
    add constraint stories_overlay_position_check
        check (overlay_position in ('top', 'center', 'bottom'));

alter table if exists public.stories
    drop constraint if exists stories_media_filter_check,
    add constraint stories_media_filter_check
        check (media_filter in ('normal', 'mono', 'warm', 'cool'));

alter table if exists public.stories
    drop constraint if exists stories_crop_mode_check,
    add constraint stories_crop_mode_check
        check (crop_mode in ('original', '9:16', '4:5', '1:1'));
