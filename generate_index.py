#!/usr/bin/env python3
import json
import os
from pathlib import Path

def scan_events(data_dir):
    """扫描data目录下的所有事件文件夹"""
    topics = []
    
    # 获取所有子目录
    subdirs = sorted([d for d in os.listdir(data_dir) 
                     if os.path.isdir(os.path.join(data_dir, d))])
    
    for subdir in subdirs:
        event_file = os.path.join(data_dir, subdir, 'new_event.json')
        
        # 检查new_event.json是否存在
        if not os.path.exists(event_file):
            print(f"⚠️  跳过 {subdir}: 没有找到 new_event.json")
            continue
        
        try:
            # 读取事件文件
            with open(event_file, 'r', encoding='utf-8') as f:
                event_data = json.load(f)
            
            # 检查是否有C_gold和ordered_buckets
            has_c_gold = any('C_gold' in str(event) for event in event_data.get('events', []))
            has_ordered_buckets = 'ordered_buckets' in event_data
            has_game = has_c_gold and has_ordered_buckets
            
            # 检查是否有封面图片
            cover_file = os.path.join(data_dir, subdir, 'cover.png')
            has_cover = os.path.exists(cover_file)
            
            topic_info = {
                "id": subdir,
                "topic": event_data.get('topic', f'事件 {subdir}'),
                "file": f"{subdir}/new_event.json",
                "hasGame": has_game,
                "hasCover": has_cover
            }
            
            topics.append(topic_info)
            
            status = "✅" if has_game else "📋"
            cover_status = "🖼️" if has_cover else "  "
            print(f"{status} {cover_status} {subdir}: {topic_info['topic'][:40]}")
            
        except Exception as e:
            print(f"❌ 错误 {subdir}: {e}")
            continue
    
    return topics

def main():
    # 设置路径
    script_dir = Path(__file__).parent
    data_dir = script_dir / 'data'
    output_file = data_dir / 'index.json'
    
    print(f"📂 扫描目录: {data_dir}")
    print(f"📝 输出文件: {output_file}\n")
    
    # 扫描事件
    topics = scan_events(data_dir)
    
    # 生成index.json
    index_data = {
        "topics": topics,
        "total": len(topics),
        "with_game": sum(1 for t in topics if t.get('hasGame', False)),
        "with_cover": sum(1 for t in topics if t.get('hasCover', False))
    }
    
    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 成功生成 index.json")
    print(f"📊 统计:")
    print(f"   - 总事件数: {index_data['total']}")
    print(f"   - 支持游戏: {index_data['with_game']}")
    print(f"   - 有封面图: {index_data['with_cover']}")

if __name__ == '__main__':
    main()
