const AdminTask = require('../models/AdminTask');
const { generateUniqueId } = require('../utils/generateUniqueId');

/**
 * @desc    Get all admin tasks with filtering
 * @route   GET /api/admin/tasks
 * @access  Private (Admin)
 */
exports.getTasks = async (req, res, next) => {
    try {
        const { status, category, priority, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (priority) query.priority = priority;

        const tasks = await AdminTask.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const totalPending = await AdminTask.countDocuments({ status: 'pending' });

        res.status(200).json({
            success: true,
            data: {
                tasks,
                totalPending
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark task as viewed
 * @route   PUT /api/admin/tasks/:id/view
 * @access  Private (Admin)
 */
exports.markAsViewed = async (req, res, next) => {
    try {
        const task = await AdminTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.status === 'pending') {
            task.status = 'viewed';
            task.viewedAt = new Date();
            await task.save();
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark task as completed
 * @route   PUT /api/admin/tasks/:id/complete
 * @access  Private (Admin)
 */
exports.markAsCompleted = async (req, res, next) => {
    try {
        const task = await AdminTask.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper function to create an admin task internally
 */
exports.createTaskInternal = async (data) => {
    try {
        const taskId = await generateUniqueId(AdminTask, 'TASK', 'taskId', 1001);
        const newTask = new AdminTask({
            taskId,
            ...data
        });
        return await newTask.save();
    } catch (error) {
        console.error('Error creating internal admin task:', error);
    }
};
