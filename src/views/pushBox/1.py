import heapq
import threading
import queue
from collections import deque
import time
from typing import List, Tuple, Set, Dict, Optional

# 方向: 上、右、下、左
DIRECTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]
DIRECTION_NAMES = ['上', '右', '下', '左']

class State:
    """游戏状态类"""
    def __init__(self, player_pos: Tuple[int, int], boxes: Set[Tuple[int, int]], 
                 parent=None, direction=None, steps=0):
        self.player_pos = player_pos  # 玩家位置
        self.boxes = boxes            # 箱子位置集合
        self.parent = parent          # 父状态
        self.direction = direction    # 从父状态到达此状态的移动方向
        self.steps = steps            # 从初始状态到达此状态的步数
        self._hash = None
    
    def __hash__(self):
        if self._hash is None:
            self._hash = hash((self.player_pos, frozenset(self.boxes)))
        return self._hash
    
    def __eq__(self, other):
        return (self.player_pos == other.player_pos and 
                self.boxes == other.boxes)
                
    def __lt__(self, other):
        # 为了在heapq中使用，需要定义比较方法
        # 这里只是为了满足heapq的要求，实际比较由f值决定
        return id(self) < id(other)

class SokobanSolver:
    def __init__(self, game_map: List[List[int]]):
        self.game_map = game_map
        self.height = len(game_map)
        self.width = len(game_map[0]) if self.height > 0 else 0
        self.player_pos = None
        self.boxes = set()
        self.targets = set()
        self.walls = set()
        self.deadlock_positions = set()
        self.parse_map()
        self.compute_deadlocks()
    
    def parse_map(self):
        """解析地图，找出玩家、箱子、目标位置和墙"""
        for i in range(self.height):
            for j in range(self.width):
                cell = self.game_map[i][j]
                if cell == 1:  # 墙
                    self.walls.add((i, j))
                elif cell == 3:  # 目标位置
                    self.targets.add((i, j))
                elif cell == 4:  # 箱子
                    self.boxes.add((i, j))
                elif cell == 5:  # 处于目标位置的箱子
                    self.boxes.add((i, j))
                    self.targets.add((i, j))
                elif cell == 6:  # 人物
                    self.player_pos = (i, j)
                elif cell == 7:  # 人物与目标重合
                    self.player_pos = (i, j)
                    self.targets.add((i, j))
    
    def compute_deadlocks(self):
        """计算死锁位置（不是目标点且在角落或墙边无法推动的位置）"""
        # 简单角落死锁检测
        for i in range(self.height):
            for j in range(self.width):
                if (i, j) in self.walls or (i, j) in self.targets:
                    continue
                
                # 检查是否是角落死锁
                wall_count = 0
                for di, dj in DIRECTIONS:
                    ni, nj = i + di, j + dj
                    if (ni, nj) in self.walls:
                        wall_count += 1
                
                # 如果至少两个相邻方向是墙，且这两个方向相邻，则是角落死锁
                if wall_count >= 2:
                    for k in range(4):
                        di1, dj1 = DIRECTIONS[k]
                        di2, dj2 = DIRECTIONS[(k+1)%4]
                        if ((i+di1, j+dj1) in self.walls and 
                            (i+di2, j+dj2) in self.walls):
                            self.deadlock_positions.add((i, j))
                            break
    
    def is_valid_move(self, pos: Tuple[int, int]) -> bool:
        """检查位置是否有效（不是墙）"""
        i, j = pos
        return (0 <= i < self.height and 
                0 <= j < self.width and 
                pos not in self.walls)
    
    def is_deadlock(self, box_pos: Tuple[int, int], boxes: Set[Tuple[int, int]]) -> bool:
        """检查箱子是否处于死锁状态"""
        # 如果箱子已经在目标位置，则不是死锁
        if box_pos in self.targets:
            return False
        
        # 如果箱子在预计算的死锁位置，则是死锁
        if box_pos in self.deadlock_positions:
            return True
        
        # 更复杂的死锁检测可以在这里添加
        return False
    
    def get_next_states(self, state: State) -> List[State]:
        """获取当前状态的所有可能下一状态"""
        next_states = []
        player_i, player_j = state.player_pos
        
        for idx, (di, dj) in enumerate(DIRECTIONS):
            # 玩家移动后的位置
            new_i, new_j = player_i + di, player_j + dj
            new_pos = (new_i, new_j)
            
            # 如果新位置是墙，则不能移动
            if not self.is_valid_move(new_pos):
                continue
            
            # 如果新位置有箱子
            if new_pos in state.boxes:
                # 箱子移动后的位置
                box_i, box_j = new_i + di, new_j + dj
                box_pos = (box_i, box_j)
                
                # 如果箱子可以被推动
                if (self.is_valid_move(box_pos) and 
                    box_pos not in state.boxes):
                    
                    # 创建新的箱子集合
                    new_boxes = state.boxes.copy()
                    new_boxes.remove(new_pos)
                    new_boxes.add(box_pos)
                    
                    # 检查是否会导致死锁
                    if not self.is_deadlock(box_pos, new_boxes):
                        next_states.append(State(
                            new_pos, 
                            new_boxes, 
                            state, 
                            DIRECTION_NAMES[idx],
                            state.steps + 1
                        ))
            else:
                # 如果新位置没有箱子，玩家可以直接移动
                next_states.append(State(
                    new_pos, 
                    state.boxes, 
                    state, 
                    DIRECTION_NAMES[idx],
                    state.steps + 1
                ))
        
        return next_states
    
    def is_goal(self, state: State) -> bool:
        """检查是否达到目标状态（所有箱子都在目标位置）"""
        return all(box in self.targets for box in state.boxes)
    
    def get_path(self, final_state: State) -> List[str]:
        """从最终状态回溯得到路径"""
        path = []
        current = final_state
        while current.parent:
            path.append(current.direction)
            current = current.parent
        return path[::-1]  # 反转路径，从起始到结束
    
    def solve_bfs(self) -> Optional[List[str]]:
        """使用BFS算法求解"""
        initial_state = State(self.player_pos, self.boxes)
        visited = {initial_state}
        queue = deque([initial_state])
        
        while queue:
            current_state = queue.popleft()
            
            if self.is_goal(current_state):
                return self.get_path(current_state)
            
            for next_state in self.get_next_states(current_state):
                if next_state not in visited:
                    visited.add(next_state)
                    queue.append(next_state)
        
        return None  # 无解
    
    def solve_a_star(self) -> Optional[List[str]]:
        """使用A*算法求解"""
        def heuristic(state: State) -> int:
            """启发式函数：箱子到最近目标的曼哈顿距离之和"""
            if not self.targets:
                return 0
                
            total = 0
            for box in state.boxes:
                # 找到离箱子最近的目标
                min_dist = min(abs(box[0] - t[0]) + abs(box[1] - t[1]) 
                              for t in self.targets)
                total += min_dist
            return total
        
        initial_state = State(self.player_pos, self.boxes)
        visited = {initial_state}
        # 优先队列: (f=g+h, 步数, 状态)
        open_set = [(heuristic(initial_state), 0, initial_state)]
        
        while open_set:
            _, _, current_state = heapq.heappop(open_set)
            
            if self.is_goal(current_state):
                return self.get_path(current_state)
            
            for next_state in self.get_next_states(current_state):
                if next_state not in visited:
                    visited.add(next_state)
                    f = next_state.steps + heuristic(next_state)
                    heapq.heappush(open_set, (f, next_state.steps, next_state))
        
        return None  # 无解

def solve_with_thread(game_map: List[List[int]], 
                     algorithm: str = 'bfs',
                     timeout: int = 30) -> Optional[List[str]]:
    """使用线程求解，支持超时"""
    result_queue = queue.Queue()
    
    def worker():
        solver = SokobanSolver(game_map)
        if algorithm == 'bfs':
            result = solver.solve_bfs()
        else:
            result = solver.solve_a_star()
        result_queue.put(result)
    
    # 启动求解线程
    thread = threading.Thread(target=worker)
    thread.daemon = True
    thread.start()
    
    # 等待结果或超时
    thread.join(timeout)
    if thread.is_alive():
        return None  # 超时
    
    return result_queue.get()

def solve_multi_threaded(game_map: List[List[int]], 
                        thread_count: int = 2,
                        timeout: int = 30) -> Optional[List[str]]:
    """使用多线程并行尝试不同算法求解"""
    result_queue = queue.Queue()
    
    def worker(algorithm):
        solver = SokobanSolver(game_map)
        if algorithm == 'bfs':
            result = solver.solve_bfs()
        else:
            result = solver.solve_a_star()
        if result:
            result_queue.put((algorithm, result))
    
    # 启动多个线程，使用不同算法
    threads = []
    algorithms = ['bfs', 'a_star']
    for alg in algorithms[:thread_count]:
        thread = threading.Thread(target=worker, args=(alg,))
        thread.daemon = True
        thread.start()
        threads.append(thread)
    
    # 等待任一线程完成或全部超时
    start_time = time.time()
    while time.time() - start_time < timeout:
        if not result_queue.empty():
            break
        time.sleep(0.1)
    
    # 获取结果
    if not result_queue.empty():
        alg, result = result_queue.get()
        return result
    
    return None  # 所有线程都超时或无解

def solve_sokoban(game_map: List[List[int]]) -> List[str]:
    """推箱子求解主函数，返回移动步骤列表"""
    # 尝试使用多线程求解
    result = solve_multi_threaded(game_map, thread_count=2, timeout=30)
    
    if result is None:
        # 如果多线程求解失败，尝试单线程A*算法，给予更长时间
        solver = SokobanSolver(game_map)
        result = solver.solve_a_star()
    
    return result if result else []

# 示例使用
if __name__ == "__main__":
    # 示例地图
    # 0 - 不可达区域, 1 - 墙, 2 - 可行走空间, 3 - 目标位置
    # 4 - 箱子, 5 - 处于目标位置的箱子, 6 - 人物, 7 - 人物与目标重合
    example_map =  [
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 1, 2, 1, 2, 2, 2, 1],
    [1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 1],
    [1, 2, 2, 4, 3, 6, 3, 4, 2, 2, 1],
    [1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
  ]
    
    steps = solve_sokoban(example_map)
    print("解决方案:", steps)
